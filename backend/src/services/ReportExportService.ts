/**
 * 报告导出服务
 * 支持导出PDF和Word格式的分析报告
 */
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { logger } from '../utils/logger';
import { getChineseFontPath, initFontDirectory, isChineseFontAvailable } from '../utils/fontLoader';

export interface AnalysisReportData {
  id: number;
  shop_name: string;
  shop_address: string;
  province?: string;
  city?: string;
  district?: string;
  rent_amount?: number;
  analysis_score?: number;
  description?: string;
  longitude?: number;
  latitude?: number;
  updated_at?: string;
}

/**
 * 评分规则说明
 */
const SCORING_RULES = `
评分规则说明：

本报告采用100分制评分体系，综合评估铺位的商业价值和风险，具体权重分配如下：

1. 人流量潜力（高峰与持续性）：40%
   - 评估铺位周边的人流密集程度
   - 考虑高峰时段（早中晚）和持续性的流量
   - 评估路过流量与目的地流量的比例

2. 目标客群匹配度：30%
   - 评估周边人群与项目目标客户的匹配程度
   - 考虑消费能力、消费习惯和需求强度
   - 评估潜在客户的规模和质量

3. 竞争环境压力与差异化空间：20%
   - 评估周边同类竞争店铺的密度和实力
   - 分析差异化定位的空间和机会
   - 考虑间接竞争（便利店、饮品店等）的影响

4. 可见性与便利性：10%
   - 评估铺位的临街情况和可见度
   - 考虑交通便利性（公交站、地铁站距离）
   - 评估停车便利性和可达性

评分等级：
- 优秀（85-100分）：位置极佳，商业价值高，风险低，强烈推荐
- 良好（70-84分）：位置良好，商业价值较高，风险可控，推荐
- 中等（50-69分）：位置一般，商业价值中等，需要谨慎评估
- 风险高（0-49分）：位置欠佳，商业价值较低，风险较高，不推荐

注：本评分仅供参考，实际投资决策需结合具体市场情况、经营策略和资金实力综合评估。

本报告由智能选址分析系统自动生成，评分基于大数据分析和AI智能评估。
`;

/**
 * 生成PDF报告
 */
export async function generatePDFReport(data: AnalysisReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // 初始化字体目录
      initFontDirectory();
      
      // 获取中文字体路径
      const chineseFontPath = getChineseFontPath();
      const fontAvailable = isChineseFontAvailable();
      
      if (!fontAvailable) {
        logger.warn('中文字体文件未找到，PDF中的中文可能显示为乱码。请将字体文件放到 backend/fonts/ 目录下。');
      } else {
        logger.info(`使用中文字体: ${chineseFontPath}`);
      }
      
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // 设置中文字体（如果可用）
      if (chineseFontPath) {
        doc.font(chineseFontPath);
      } else {
        doc.font('Helvetica'); // 回退到默认字体
      }

      // 标题
      doc.fontSize(20)
        .font(chineseFontPath || 'Helvetica-Bold')
        .text('铺位选址分析报告', { align: 'center' })
        .moveDown(1);

      // 基本信息
      doc.fontSize(14)
        .font(chineseFontPath || 'Helvetica-Bold')
        .text('一、基本信息', { underline: true })
        .moveDown(0.5);

      doc.fontSize(12)
        .font(chineseFontPath || 'Helvetica')
        .text(`店铺名称：${data.shop_name || '未知'}`)
        .text(`店铺地址：${data.shop_address || '未知'}`)
        .text(`所在位置：${data.province || ''} ${data.city || ''} ${data.district || ''}`)
        .text(`租金信息：${data.rent_amount ? `¥${data.rent_amount}/月` : '未提供'}`)
        .text(`坐标信息：${data.longitude && data.latitude ? `${data.longitude}, ${data.latitude}` : '未提供'}`)
        .text(`分析时间：${data.updated_at ? new Date(data.updated_at).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN')}`)
        .moveDown(1);

      // 评分结果
      if (data.analysis_score !== null && data.analysis_score !== undefined && data.analysis_score > 0) {
        const score = data.analysis_score;
        const grade = score >= 85 ? '优秀' : score >= 70 ? '良好' : score >= 50 ? '中等' : '风险高';
        const scoreColor = score >= 85 ? '#52c41a' : score >= 70 ? '#faad14' : score >= 50 ? '#ff9800' : '#ff4d4f';

        doc.fontSize(14)
          .font(chineseFontPath || 'Helvetica-Bold')
          .text('二、评分结果', { underline: true })
          .moveDown(0.5);

        // PDF不支持十六进制颜色，需要转换为RGB
        const rgbColor = hexToRgb(scoreColor);
        doc.fontSize(16)
          .font(chineseFontPath || 'Helvetica-Bold')
          .fillColor([rgbColor.r * 255, rgbColor.g * 255, rgbColor.b * 255])
          .text(`综合评分：${score.toFixed(1)}分`, { continued: true })
          .fillColor('black')
          .text(`  （${grade}）`)
          .moveDown(1);
      }

      // 详细分析报告
      if (data.description) {
        doc.fontSize(14)
          .font(chineseFontPath || 'Helvetica-Bold')
          .fillColor('black')
          .text('三、详细分析报告', { underline: true })
          .moveDown(0.5);

        // 解析并格式化分析报告内容
        const formattedReport = formatReportContent(data.description);
        
        doc.fontSize(11)
          .font(chineseFontPath || 'Helvetica')
          .text(formattedReport, {
            align: 'left',
            indent: 0,
            lineGap: 3
          })
          .moveDown(1);
      }

      // 评分规则说明
      doc.addPage()
        .fontSize(14)
        .font(chineseFontPath || 'Helvetica-Bold')
        .text('四、评分规则说明', { underline: true })
        .moveDown(0.5);

      // 提取评分规则文本（不包含落款部分）
      const rulesText = SCORING_RULES.replace(/本报告由.*振鸿科技.*出品.*$/s, '').trim();

      doc.fontSize(10)
        .font(chineseFontPath || 'Helvetica')
        .text(rulesText, {
          align: 'left',
          indent: 0,
          lineGap: 2
        })
        .moveDown(2);

      // 落款
      doc.fontSize(12)
        .font(chineseFontPath || 'Helvetica')
        .text('本报告由智能选址分析系统生成', { align: 'right' })
        .moveDown(0.5)
        .font(chineseFontPath || 'Helvetica-Bold')
        .text('振鸿科技 出品', { align: 'right' });

      doc.end();
    } catch (error: any) {
      logger.error('生成PDF报告失败:', error);
      reject(error);
    }
  });
}

/**
 * 生成Word报告
 */
export async function generateWordReport(data: AnalysisReportData): Promise<Buffer> {
  try {
    const paragraphs: Paragraph[] = [];

    // 标题
    paragraphs.push(
      new Paragraph({
        text: '铺位选址分析报告',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // 基本信息
    paragraphs.push(
      new Paragraph({
        text: '一、基本信息',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `店铺名称：${data.shop_name || '未知'}`, break: 1 }),
          new TextRun({ text: `店铺地址：${data.shop_address || '未知'}`, break: 1 }),
          new TextRun({ text: `所在位置：${data.province || ''} ${data.city || ''} ${data.district || ''}`, break: 1 }),
          new TextRun({ text: `租金信息：${data.rent_amount ? `¥${data.rent_amount}/月` : '未提供'}`, break: 1 }),
          new TextRun({ text: `坐标信息：${data.longitude && data.latitude ? `${data.longitude}, ${data.latitude}` : '未提供'}`, break: 1 }),
          new TextRun({ text: `分析时间：${data.updated_at ? new Date(data.updated_at).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN')}`, break: 1 })
        ],
        spacing: { after: 400 }
      })
    );

    // 评分结果
    if (data.analysis_score !== null && data.analysis_score !== undefined && data.analysis_score > 0) {
      const score = data.analysis_score;
      const grade = score >= 85 ? '优秀' : score >= 70 ? '良好' : score >= 50 ? '中等' : '风险高';

      paragraphs.push(
        new Paragraph({
          text: '二、评分结果',
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ 
              text: `综合评分：${score.toFixed(1)}分`, 
              bold: true, 
              size: 32,
              color: score >= 85 ? '52c41a' : score >= 70 ? 'faad14' : score >= 50 ? 'ff9800' : 'ff4d4f'
            }),
            new TextRun({ text: ` （${grade}）`, bold: true, size: 24 })
          ],
          spacing: { after: 400 }
        })
      );
    }

    // 详细分析报告
    if (data.description) {
      paragraphs.push(
        new Paragraph({
          text: '三、详细分析报告',
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 }
        }),
        ...formatReportContentForWord(data.description),
        new Paragraph({
          text: '',
          spacing: { after: 400 }
        })
      );
    }

    // 评分规则说明
    paragraphs.push(
      new Paragraph({
        text: '四、评分规则说明',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      }),
      ...formatScoringRulesForWord()
    );

    // 落款
    paragraphs.push(
      new Paragraph({
        text: '',
        spacing: { after: 800 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '本报告由智能选址分析系统生成', break: 1 }),
          new TextRun({ text: '振鸿科技 出品', bold: true })
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 }
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error: any) {
    logger.error('生成Word报告失败:', error);
    throw error;
  }
}

/**
 * 将十六进制颜色转换为RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

/**
 * 格式化报告内容（用于PDF）
 */
function formatReportContent(content: string): string {
  // 清理Markdown标记
  let formatted = content
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/---/g, '─────────────');
  
  return formatted;
}

/**
 * 格式化报告内容（用于Word）
 */
function formatReportContentForWord(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const cleanLine = line.trim()
      .replace(/\*\*/g, '')
      .replace(/^[#*-]\s*/, '')
      .replace(/---/g, '─────────────');
    
    if (cleanLine.length === 0) continue;
    
    // 判断是否是标题
    if (cleanLine.match(/^[一二三四五六七八九十]+[、.]/)) {
      paragraphs.push(
        new Paragraph({
          text: cleanLine,
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 150 }
        })
      );
    } else if (cleanLine.match(/^[-•]/)) {
      // 移除开头的-或•，使用Paragraph的bullet属性
      const bulletText = cleanLine.replace(/^[-•]\s*/, '');
      paragraphs.push(
        new Paragraph({
          text: bulletText,
          bullet: { level: 0 },
          spacing: { after: 100 }
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          text: cleanLine,
          spacing: { after: 100 }
        })
      );
    }
  }
  
  return paragraphs;
}

/**
 * 格式化评分规则（用于Word）
 */
function formatScoringRulesForWord(): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const rules = SCORING_RULES.split('\n').filter(line => line.trim());
  
  for (const line of rules) {
    if (line.trim().length === 0) continue;
    
    if (line.match(/^\d+\./)) {
      // 主要规则项
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line.trim(), bold: true })],
          spacing: { after: 100 }
        })
      );
    } else if (line.match(/^[-\u2022]/)) {
      // 子项
      paragraphs.push(
        new Paragraph({
          text: line.trim(),
          bullet: { level: 0 },
          spacing: { after: 80 }
        })
      );
    } else {
      // 普通文本
      paragraphs.push(
        new Paragraph({
          text: line.trim(),
          spacing: { after: 80 }
        })
      );
    }
  }
  
  return paragraphs;
}

