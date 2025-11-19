import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore - docx types may not be fully recognized
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';
import dayjs from 'dayjs';
// @ts-ignore - html2canvas types may not be fully recognized
import html2canvas from 'html2canvas';
import { loadChineseFont, isChineseFontLoaded } from './fonts/loadChineseFont';
import { message } from 'antd';

/**
 * AI洞察导出工具
 * 支持PDF和Word格式导出
 */

interface AIInsightsData {
  insights?: {
    healthScore?: number;
    customerValueAssessment?: string;
    churnRiskPrediction?: string;
    personalizedMarketingSuggestions?: string[];
    priorityActions?: Array<{
      priority: string;
      title: string;
      description: string;
      action: string;
    }>;
    productRecommendationStrategy?: string;
    competitiveMarketingSuggestions?: string[];
    dataTables?: Array<{
      title: string;
      data: any[];
      columns: string[];
    }>;
  };
  generatedAt?: string;
  rawData?: {
    segments?: any[];
    timeDistribution?: any[];
    productPreferences?: any[];
  };
}

/**
 * 获取文件名
 */
function getFileName(city: string, storeName: string): string {
  const date = dayjs().format('YYYY-MM-DD');
  const cityName = city || '全部城市';
  const store = storeName || '全部门店';
  return `${cityName}_${store}_${date}`;
}

/**
 * 导出PDF - 使用html2canvas将前端内容转换为图片
 * 这样可以完美支持中文显示，实现所见即所得
 */
export async function exportToPDF(
  data: AIInsightsData,
  city: string = '',
  storeName: string = ''
): Promise<void> {
  const fileName = getFileName(city, storeName);
  
  // 查找AI洞察Modal的内容元素
  const modalElement = document.querySelector('.ai-insights-modal .ant-modal-body');
  if (!modalElement) {
    message.error('未找到AI洞察内容，请先打开AI洞察弹窗');
    return;
  }
  
  try {
    message.loading({ content: '正在生成PDF...', key: 'pdf-export', duration: 0 });
    
    // 临时移除滚动限制，确保能捕获所有内容
    const originalStyle = (modalElement as HTMLElement).style.cssText;
    (modalElement as HTMLElement).style.overflow = 'visible';
    (modalElement as HTMLElement).style.maxHeight = 'none';
    
    // 获取实际内容高度
    const contentHeight = (modalElement as HTMLElement).scrollHeight;
    const contentWidth = (modalElement as HTMLElement).scrollWidth;
    
    // 使用html2canvas将内容转换为图片
    const canvas = await html2canvas(modalElement as HTMLElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: contentWidth,
      height: contentHeight,
      windowWidth: contentWidth,
      windowHeight: contentHeight,
      scrollX: 0,
      scrollY: 0,
      allowTaint: true,
      removeContainer: false
    });
    
    // 恢复原始样式
    (modalElement as HTMLElement).style.cssText = originalStyle;
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    const imgWidth = 210; // A4宽度（mm）
    const pageHeight = 297; // A4高度（mm）
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    const doc = new jsPDF('p', 'mm', 'a4');
    let position = 0;
    
    // 添加第一页
    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // 如果内容超过一页，添加新页
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    doc.save(`${fileName}_AI洞察报告.pdf`);
    message.success({ content: 'PDF导出成功', key: 'pdf-export' });
  } catch (error) {
    console.error('PDF导出失败:', error);
    // 恢复原始样式
    const modalElement = document.querySelector('.ai-insights-modal .ant-modal-body');
    if (modalElement) {
      (modalElement as HTMLElement).style.overflow = 'auto';
      (modalElement as HTMLElement).style.maxHeight = '70vh';
    }
    message.error({ content: 'PDF导出失败，请重试', key: 'pdf-export' });
    
    // 如果html2canvas失败，回退到原来的方法
    await exportToPDFFallback(data, city, storeName);
  }
}

/**
 * PDF导出回退方法（使用autoTable）
 */
async function exportToPDFFallback(
  data: AIInsightsData,
  city: string = '',
  storeName: string = ''
): Promise<void> {
  const doc = new jsPDF();
  const fileName = getFileName(city, storeName);
  
  // 尝试加载中文字体
  let fontLoaded = false;
  let fontName = 'helvetica'; // 默认字体
  try {
    console.log('开始加载中文字体...');
    await loadChineseFont(doc);
    
    // 检查字体是否已加载
    const fonts = (doc as any).getFontList();
    console.log('当前字体列表:', fonts ? Object.keys(fonts) : '无');
    
    fontLoaded = isChineseFontLoaded(doc);
    if (fontLoaded) {
      console.log('✅ 中文字体加载成功');
      // 直接使用配置的字体别名（SourceHanSans）
      fontName = 'SourceHanSans';
      console.log('使用的字体名称:', fontName);
      
      // 验证字体是否在字体列表中
      if (fonts) {
        console.log('可用字体列表:', Object.keys(fonts));
        if (!fonts[fontName]) {
          console.warn(`⚠️ 字体 ${fontName} 不在字体列表中，将使用默认字体`);
          fontName = 'helvetica';
          fontLoaded = false;
        } else {
          console.log(`✅ 确认字体 ${fontName} 在字体列表中`);
        }
      }
    } else {
      console.warn('⚠️ 字体加载检查失败，将使用默认字体');
      // 即使检查失败，也尝试使用SourceHanSans
      if (fonts && fonts['SourceHanSans']) {
        fontName = 'SourceHanSans';
        fontLoaded = true;
        console.log('✅ 强制使用SourceHanSans字体');
      }
    }
  } catch (error) {
    console.error('❌ 中文字体加载失败:', error);
    console.warn('将使用默认字体 helvetica，中文可能显示为乱码');
    // 字体加载失败不影响PDF导出，继续使用autoTable的默认处理
  }
  
  let startY = 20;
  
  // 标题 - 使用autoTable来支持中文
  autoTable(doc, {
    head: [['AI深度客户洞察报告']],
    body: [],
    startY: startY,
    theme: 'plain',
    headStyles: { 
      fillColor: [255, 255, 255],
      textColor: [24, 144, 255],
      fontSize: 18,
      fontStyle: 'bold',
      font: fontName,
      halign: 'center'
    },
    styles: { fontSize: 18, halign: 'center', font: fontName },
    margin: { left: 20, right: 20 },
    tableWidth: 'wrap'
  });
  
  startY = (doc as any).lastAutoTable.finalY + 15;
  
  // 副标题信息
  autoTable(doc, {
    head: [],
    body: [
      ['城市', city || '全部城市'],
      ['门店', storeName || '全部门店'],
      ['生成时间', data.generatedAt ? dayjs(data.generatedAt).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss')]
    ],
    startY: startY,
    theme: 'plain',
    headStyles: { fillColor: [245, 245, 245], font: fontName },
    bodyStyles: { fontSize: 11, font: fontName },
    columnStyles: {
      0: { fontStyle: 'bold', font: fontName, cellWidth: 50 },
      1: { cellWidth: 'auto', font: fontName }
    },
    margin: { left: 20, right: 20 }
  });
  
  startY = (doc as any).lastAutoTable.finalY + 10;
  
  // 重要提示
  autoTable(doc, {
    head: [],
    body: [['重要提示：本报告数据仅供参考，AI洞察基于算法分析，实际决策请结合业务实际情况。']],
    startY: startY,
    theme: 'plain',
    headStyles: { fillColor: [255, 77, 79], font: fontName },
    bodyStyles: { 
      fontSize: 10,
      textColor: [255, 77, 79],
      fontStyle: 'bold',
      font: fontName
    },
    margin: { left: 20, right: 20 }
  });
  
  startY = (doc as any).lastAutoTable.finalY + 15;
  
  // 1. 客户健康度评分
  autoTable(doc, {
    head: [['一、客户健康度评分']],
    body: [],
    startY: startY,
    theme: 'plain',
    headStyles: { 
      fillColor: [41, 73, 130],
      textColor: [255, 255, 255],
      fontSize: 14,
      fontStyle: 'bold',
      font: fontName
    },
    margin: { left: 20, right: 20 }
  });
  
  startY = (doc as any).lastAutoTable.finalY + 5;
  
  const healthScore = data.insights?.healthScore || 0;
  const healthColor: [number, number, number] = healthScore > 70 ? [63, 134, 0] : [207, 19, 34];
  
  autoTable(doc, {
    head: [],
    body: [
      ['健康度评分', `${healthScore}/100`],
      ['客户价值评估', data.insights?.customerValueAssessment || '评估中...'],
      ['流失风险预测', data.insights?.churnRiskPrediction || '分析中...']
    ],
    startY: startY,
    theme: 'plain',
    bodyStyles: { fontSize: 11,
      font: fontName },
    columnStyles: {
      0: { fontStyle: 'bold', font: fontName, cellWidth: 60 },
      1: { cellWidth: 'auto', textColor: healthColor, font: fontName }
    },
    margin: { left: 25, right: 20 }
  });
  
  startY = (doc as any).lastAutoTable.finalY + 10;
  
  // 2. 个性化营销建议
  if (data.insights?.personalizedMarketingSuggestions && data.insights.personalizedMarketingSuggestions.length > 0) {
    autoTable(doc, {
      head: [['二、个性化营销建议']],
      body: [],
      startY: startY,
      theme: 'plain',
      headStyles: { 
        fillColor: [41, 73, 130],
        textColor: [255, 255, 255],
        fontSize: 14,
        fontStyle: 'bold',
      font: fontName
      },
      margin: { left: 20, right: 20 }
    });
    
    startY = (doc as any).lastAutoTable.finalY + 5;
    
    const suggestionsBody = data.insights.personalizedMarketingSuggestions.map((suggestion, index) => [
      `${index + 1}.`,
      suggestion
    ]);
    
    autoTable(doc, {
      head: [],
      body: suggestionsBody,
      startY: startY,
      theme: 'plain',
      bodyStyles: { fontSize: 11,
      font: fontName },
      columnStyles: {
        0: { font: fontName, cellWidth: 15, halign: 'right' },
        1: { cellWidth: 'auto', font: fontName }
      },
      margin: { left: 25, right: 20 }
    });
    
    startY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // 3. 竞品营销方法建议
  if (data.insights?.competitiveMarketingSuggestions && data.insights.competitiveMarketingSuggestions.length > 0) {
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }
    
    autoTable(doc, {
      head: [['三、竞品营销方法参考']],
      body: [],
      startY: startY,
      theme: 'plain',
      headStyles: { 
        fillColor: [41, 73, 130],
        textColor: [255, 255, 255],
        fontSize: 14,
        fontStyle: 'bold',
      font: fontName
      },
      margin: { left: 20, right: 20 }
    });
    
    startY = (doc as any).lastAutoTable.finalY + 5;
    
    const competitiveBody = data.insights.competitiveMarketingSuggestions.map((suggestion, index) => [
      `${index + 1}.`,
      suggestion
    ]);
    
    autoTable(doc, {
      head: [],
      body: competitiveBody,
      startY: startY,
      theme: 'plain',
      bodyStyles: { fontSize: 11,
      font: fontName },
      columnStyles: {
        0: { font: fontName, cellWidth: 15, halign: 'right' },
        1: { cellWidth: 'auto', font: fontName }
      },
      margin: { left: 25, right: 20 }
    });
    
    startY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // 4. 优先行动建议
  if (data.insights?.priorityActions && data.insights.priorityActions.length > 0) {
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }
    
    autoTable(doc, {
      head: [['四、优先行动建议']],
      body: [],
      startY: startY,
      theme: 'plain',
      headStyles: { 
        fillColor: [41, 73, 130],
        textColor: [255, 255, 255],
        fontSize: 14,
        fontStyle: 'bold',
      font: fontName
      },
      margin: { left: 20, right: 20 }
    });
    
    startY = (doc as any).lastAutoTable.finalY + 5;
    
    const actionsBody = data.insights.priorityActions.map((action, index) => {
      const priorityText = action.priority === 'high' ? '高优先级' : action.priority === 'medium' ? '中优先级' : '低优先级';
      return [
        `${index + 1}. [${priorityText}] ${action.title}`,
        `描述：${action.description}`,
        `建议行动：${action.action}`
      ];
    }).flat();
    
    // 为每个行动创建多行
    const formattedActionsBody: string[][] = [];
    data.insights.priorityActions.forEach((action, index) => {
      const priorityText = action.priority === 'high' ? '高优先级' : action.priority === 'medium' ? '中优先级' : '低优先级';
      formattedActionsBody.push([`${index + 1}. [${priorityText}] ${action.title}`, '']);
      formattedActionsBody.push(['', `描述：${action.description}`]);
      formattedActionsBody.push(['', `建议行动：${action.action}`]);
      formattedActionsBody.push(['', '']); // 空行分隔
    });
    
    autoTable(doc, {
      head: [],
      body: formattedActionsBody,
      startY: startY,
      theme: 'plain',
      bodyStyles: { fontSize: 10,
      font: fontName },
      columnStyles: {
        0: { font: fontName, cellWidth: 20 },
        1: { cellWidth: 'auto', font: fontName }
      },
      margin: { left: 25, right: 20 }
    });
    
    startY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // 5. 数据表格
  if (data.insights?.dataTables && data.insights.dataTables.length > 0) {
    data.insights.dataTables.forEach((table, tableIndex) => {
      if (startY > 220) {
        doc.addPage();
        startY = 20;
      }
      
      // 表格标题
      autoTable(doc, {
        head: [[table.title]],
        body: [],
        startY: startY,
        theme: 'plain',
        headStyles: { 
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontSize: 12,
          fontStyle: 'bold',
      font: fontName
        },
        margin: { left: 20, right: 20 }
      });
      
      startY = (doc as any).lastAutoTable.finalY + 5;
      
      // 限制数据不超过20条
      const tableData = table.data.slice(0, 20);
      const tableBody = tableData.map((row: any) => 
        table.columns.map((col: string) => String(row[col] || ''))
      );
      
      autoTable(doc, {
        head: [table.columns],
        body: tableBody,
        startY: startY,
        theme: 'striped',
        headStyles: { 
          fillColor: [41, 73, 130],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
      font: fontName
        },
        bodyStyles: { fontSize: 9,
      font: fontName },
        margin: { left: 25, right: 20 },
        styles: { overflow: 'linebreak', cellWidth: 'wrap', font: fontName }
      });
      
      startY = (doc as any).lastAutoTable.finalY + 10;
    });
  }
  
  // 6. 产品推荐策略
  if (data.insights?.productRecommendationStrategy) {
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }
    
    autoTable(doc, {
      head: [['五、产品推荐策略']],
      body: [],
      startY: startY,
      theme: 'plain',
      headStyles: { 
        fillColor: [41, 73, 130],
        textColor: [255, 255, 255],
        fontSize: 14,
        fontStyle: 'bold',
      font: fontName
      },
      margin: { left: 20, right: 20 }
    });
    
    startY = (doc as any).lastAutoTable.finalY + 5;
    
    // 将策略文本分割成多行
    const strategyLines = data.insights.productRecommendationStrategy.split('\n').filter(line => line.trim());
    const strategyBody = strategyLines.map(line => [line.trim()]);
    
    autoTable(doc, {
      head: [],
      body: strategyBody,
      startY: startY,
      theme: 'plain',
      bodyStyles: { fontSize: 11,
      font: fontName },
      margin: { left: 25, right: 20 }
    });
    
    startY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // 7. AI洞察方法说明
  if (startY > 250) {
    doc.addPage();
    startY = 20;
  }
  
  autoTable(doc, {
    head: [['六、AI洞察方法说明']],
    body: [],
    startY: startY,
    theme: 'plain',
    headStyles: { 
      fillColor: [41, 73, 130],
      textColor: [255, 255, 255],
      fontSize: 14,
      fontStyle: 'bold',
      font: fontName
    },
    margin: { left: 20, right: 20 }
  });
  
  startY = (doc as any).lastAutoTable.finalY + 5;
  
  const methods = [
    '1. RFM模型分析：基于客户最近购买时间(Recency)、购买频率(Frequency)和消费金额(Monetary)进行客户分群，识别高价值客户和潜在流失客户',
    '2. 客户健康度评分：综合客户价值、活跃度、购买频率变化趋势和流失风险等因素，采用加权算法计算0-100分健康度评分，实时监控客户状态',
    '3. 流失风险预测：基于客户最后订单时间、购买频率变化趋势、消费金额变化和客户生命周期阶段进行流失风险评估，提前预警',
    '4. 个性化推荐：基于客户历史购买行为、产品偏好、相似客户群体特征和协同过滤算法生成个性化营销建议，提升转化率',
    '5. 机器学习算法：采用OpenAI GPT模型进行深度分析和自然语言生成，结合行业最佳实践，提供可执行的行动建议',
    '6. 竞品分析：参考同行业优秀企业的营销策略和客户运营方法，结合自身数据特点，提供差异化竞争建议',
    '7. 数据驱动决策：基于实时数据分析和预测模型，为营销活动、产品优化和客户服务提供数据支撑'
  ];
  
  const methodsBody = methods.map(method => [method]);
  
  autoTable(doc, {
    head: [],
    body: methodsBody,
    startY: startY,
    theme: 'plain',
    bodyStyles: { fontSize: 10,
      font: fontName },
    margin: { left: 25, right: 20 }
  });
  
  startY = (doc as any).lastAutoTable.finalY + 10;
  
  // 8. 数据免责声明
  if (startY > 250) {
    doc.addPage();
    startY = 20;
  }
  
  autoTable(doc, {
    head: [['数据免责声明']],
    body: [],
    startY: startY,
    theme: 'plain',
    headStyles: { 
      fillColor: [255, 77, 79],
      textColor: [255, 255, 255],
      fontSize: 12,
      fontStyle: 'bold',
      font: fontName
    },
    margin: { left: 20, right: 20 }
  });
  
  startY = (doc as any).lastAutoTable.finalY + 5;
  
  const disclaimer = [
    '本报告中的所有数据和分析结果仅供参考，不构成任何商业决策建议。',
    'AI洞察基于历史数据和算法模型生成，可能存在偏差或误差。',
    '实际业务决策应结合市场环境、竞争态势和公司实际情况综合判断。',
    `报告生成时间：${data.generatedAt ? dayjs(data.generatedAt).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss')}`
  ];
  
  const disclaimerBody = disclaimer.map(text => [text]);
  
  autoTable(doc, {
    head: [],
    body: disclaimerBody,
    startY: startY,
    theme: 'plain',
    bodyStyles: { fontSize: 10,
      font: fontName },
    margin: { left: 25, right: 20 }
  });
  
  startY = (doc as any).lastAutoTable.finalY + 15;
  
  // 9. 振鸿科技 出品
  if (startY > 250) {
    doc.addPage();
    startY = 20;
  }
  
  autoTable(doc, {
    head: [],
    body: [['振鸿科技 出品']],
    startY: startY,
    theme: 'plain',
    bodyStyles: { 
      fontSize: 12,
      font: fontName,
      fontStyle: 'bold',
      halign: 'center',
      textColor: [128, 128, 128]
    },
    margin: { left: 20, right: 20 }
  });
  
  // 保存PDF
  doc.save(`${fileName}_AI洞察报告.pdf`);
}

/**
 * 导出Word
 */
export async function exportToWord(
  data: AIInsightsData,
  city: string = '',
  storeName: string = ''
): Promise<void> {
  const fileName = getFileName(city, storeName);
  
  const children: Paragraph[] = [];
  
  // 标题
  children.push(
    new Paragraph({
      text: 'AI深度客户洞察报告',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );
  
  // 副标题信息
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `城市：${city || '全部城市'}`, bold: true }),
        new TextRun({ text: '    ' }),
        new TextRun({ text: `门店：${storeName || '全部门店'}`, bold: true }),
      ],
      spacing: { after: 100 },
    })
  );
  
  children.push(
    new Paragraph({
      text: `生成时间：${data.generatedAt ? dayjs(data.generatedAt).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
      spacing: { after: 200 },
    })
  );
  
  // 重要提示
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '⚠️ 重要提示：本报告数据仅供参考，AI洞察基于算法分析，实际决策请结合业务实际情况。',
          color: 'FF4D4F',
          bold: true,
        }),
      ],
      spacing: { after: 300 },
    })
  );
  
  // 1. 客户健康度评分
  children.push(
    new Paragraph({
      text: '一、客户健康度评分',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  );
  
  const healthScore = data.insights?.healthScore || 0;
  const healthColor = healthScore > 70 ? '3F8600' : 'CF1322';
  
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `健康度评分：${healthScore}/100`,
          color: healthColor,
          bold: true,
          size: 24,
        }),
      ],
      spacing: { after: 100 },
    })
  );
  
  children.push(
    new Paragraph({
      text: `客户价值评估：${data.insights?.customerValueAssessment || '评估中...'}`,
      spacing: { after: 100 },
    })
  );
  
  children.push(
    new Paragraph({
      text: `流失风险预测：${data.insights?.churnRiskPrediction || '分析中...'}`,
      spacing: { after: 200 },
    })
  );
  
  // 2. 个性化营销建议
  if (data.insights?.personalizedMarketingSuggestions && data.insights.personalizedMarketingSuggestions.length > 0) {
    children.push(
      new Paragraph({
        text: '二、个性化营销建议',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );
    
    data.insights.personalizedMarketingSuggestions.forEach((suggestion, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${index + 1}. `, bold: true }),
            new TextRun({ text: suggestion }),
          ],
          spacing: { after: 100 },
        })
      );
    });
  }
  
  // 3. 竞品营销方法参考
  if (data.insights?.competitiveMarketingSuggestions && data.insights.competitiveMarketingSuggestions.length > 0) {
    children.push(
      new Paragraph({
        text: '三、竞品营销方法参考',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );
    
    data.insights.competitiveMarketingSuggestions.forEach((suggestion, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${index + 1}. `, bold: true }),
            new TextRun({ text: suggestion }),
          ],
          spacing: { after: 100 },
        })
      );
    });
  }
  
  // 4. 优先行动建议
  if (data.insights?.priorityActions && data.insights.priorityActions.length > 0) {
    children.push(
      new Paragraph({
        text: '四、优先行动建议',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );
    
    data.insights.priorityActions.forEach((action, index) => {
      const priorityText = action.priority === 'high' ? '高优先级' : action.priority === 'medium' ? '中优先级' : '低优先级';
      const priorityColor = action.priority === 'high' ? 'FF4D4F' : action.priority === 'medium' ? 'FAAD14' : '52C41A';
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${index + 1}. `, bold: true }),
            new TextRun({
              text: `[${priorityText}] `,
              color: priorityColor,
              bold: true,
            }),
            new TextRun({
              text: action.title,
              bold: true,
            }),
          ],
          spacing: { after: 100 },
        })
      );
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '   描述：', bold: true }),
            new TextRun({ text: action.description }),
          ],
          spacing: { after: 100 },
        })
      );
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '   建议行动：', bold: true, color: '1890FF' }),
            new TextRun({ text: action.action }),
          ],
          spacing: { after: 200 },
        })
      );
    });
  }
  
  // 5. 数据表格
  if (data.insights?.dataTables && data.insights.dataTables.length > 0) {
    data.insights.dataTables.forEach((table, tableIndex) => {
      children.push(
        new Paragraph({
          text: table.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      // 限制数据不超过20条
      const tableData = table.data.slice(0, 20);
      
      // 创建表格行
      const tableRows = [
        new TableRow({
          children: table.columns.map(col => 
            new TableCell({
              children: [new Paragraph({ text: col })],
              width: { size: 100 / table.columns.length, type: WidthType.PERCENTAGE },
              shading: { fill: 'D9D9D9' }
            })
          ),
        })
      ];
      
      tableData.forEach((row: any) => {
        tableRows.push(
          new TableRow({
            children: table.columns.map(col => 
              new TableCell({
                children: [new Paragraph({ text: String(row[col] || '') })],
                width: { size: 100 / table.columns.length, type: WidthType.PERCENTAGE }
              })
            ),
          })
        );
      });
      
      // 创建表格
      const docTable = new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      });
      
      // 将表格作为段落添加到children中
      // 注意：docx库中Table需要特殊处理，这里我们使用文本格式展示
      // 表头
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: table.columns.join('  |  '), bold: true }),
          ],
          spacing: { after: 50 },
        })
      );
      
      // 数据行
      tableData.forEach((row: any) => {
        children.push(
          new Paragraph({
            text: table.columns.map(col => String(row[col] || '')).join('  |  '),
            spacing: { after: 30 },
          })
        );
      });
      
      children.push(
        new Paragraph({
          text: `（共${tableData.length}条数据）`,
          spacing: { after: 200 },
        })
      );
    });
  }
  
  // 6. 产品推荐策略
  if (data.insights?.productRecommendationStrategy) {
    children.push(
      new Paragraph({
        text: '六、产品推荐策略',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );
    
    const strategyLines = data.insights.productRecommendationStrategy.split('\n').filter(line => line.trim());
    strategyLines.forEach(line => {
      children.push(
        new Paragraph({
          text: line.trim(),
          spacing: { after: 100 },
        })
      );
    });
  }
  
  // 7. AI洞察方法说明
  children.push(
    new Paragraph({
      text: '七、AI洞察方法说明',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  );
  
  const methods = [
    '1. RFM模型分析：基于客户最近购买时间(Recency)、购买频率(Frequency)和消费金额(Monetary)进行客户分群，识别高价值客户和潜在流失客户',
    '2. 客户健康度评分：综合客户价值、活跃度、购买频率变化趋势和流失风险等因素，采用加权算法计算0-100分健康度评分，实时监控客户状态',
    '3. 流失风险预测：基于客户最后订单时间、购买频率变化趋势、消费金额变化和客户生命周期阶段进行流失风险评估，提前预警',
    '4. 个性化推荐：基于客户历史购买行为、产品偏好、相似客户群体特征和协同过滤算法生成个性化营销建议，提升转化率',
    '5. 机器学习算法：采用OpenAI GPT模型进行深度分析和自然语言生成，结合行业最佳实践，提供可执行的行动建议',
    '6. 竞品分析：参考同行业优秀企业的营销策略和客户运营方法，结合自身数据特点，提供差异化竞争建议',
    '7. 数据驱动决策：基于实时数据分析和预测模型，为营销活动、产品优化和客户服务提供数据支撑'
  ];
  
  methods.forEach((method) => {
    children.push(
      new Paragraph({
        text: method,
        spacing: { after: 100 },
      })
    );
  });
  
  // 8. 数据免责声明
  children.push(
    new Paragraph({
      text: '数据免责声明',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 200 },
    })
  );
  
  const disclaimer = [
    '本报告中的所有数据和分析结果仅供参考，不构成任何商业决策建议。',
    'AI洞察基于历史数据和算法模型生成，可能存在偏差或误差。',
    '实际业务决策应结合市场环境、竞争态势和公司实际情况综合判断。',
    `报告生成时间：${data.generatedAt ? dayjs(data.generatedAt).format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss')}`
  ];
  
  disclaimer.forEach((text) => {
    children.push(
      new Paragraph({
        text: text,
        spacing: { after: 100 },
      })
    );
  });
  
  // 9. 振鸿科技 出品
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '振鸿科技 出品',
          bold: true,
          size: 24,
          color: '808080',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
    })
  );
  
  // 创建文档
  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });
  
  // 保存Word文档
  Packer.toBlob(doc).then((blob: Blob) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_AI洞察报告.docx`;
    link.click();
    window.URL.revokeObjectURL(url);
  });
}
