/**
 * 中文字体加载工具
 * 用于jsPDF的中文字体支持
 * 
 * 使用方法：
 * 1. 下载中文字体文件（如思源黑体）到 public/fonts 目录
 * 2. 使用字体转换工具将字体转换为Base64编码
 * 3. 调用 loadChineseFont 函数加载字体
 */

import jsPDF from 'jspdf';
import { FONT_BASE64, FONT_CONFIG, isFontConfigured } from './chineseFontBase64';

/**
 * 字体配置接口
 */
interface FontConfig {
  name: string;
  alias: string;
  base64: string;
}

/**
 * 加载中文字体到jsPDF
 * @param doc jsPDF实例
 * @param fontConfig 字体配置（可选，如果不提供则使用默认配置）
 */
export async function loadChineseFont(
  doc: jsPDF,
  fontConfig?: FontConfig
): Promise<void> {
  try {
    // 优先使用Base64编码的字体（方法2）
    if (isFontConfigured() && FONT_BASE64) {
      try {
        const fontName = fontConfig?.name || FONT_CONFIG.name;
        const fontAlias = fontConfig?.alias || FONT_CONFIG.alias;
        let base64 = fontConfig?.base64 || FONT_BASE64;
        
        // 如果Base64包含data:前缀，需要移除
        if (base64.startsWith('data:font/ttf;base64,')) {
          base64 = base64.replace('data:font/ttf;base64,', '');
        }
        
        doc.addFileToVFS(`${fontName}.ttf`, base64);
        doc.addFont(`${fontName}.ttf`, fontAlias, FONT_CONFIG.style);
        doc.setFont(fontAlias);
        console.log(`✅ 中文字体加载成功: ${fontAlias}`);
        return;
      } catch (error) {
        console.warn('Base64字体加载失败，尝试其他方法:', error);
      }
    }

    // 如果提供了自定义字体配置，使用它
    if (fontConfig) {
      doc.addFileToVFS(`${fontConfig.name}.ttf`, fontConfig.base64);
      doc.addFont(`${fontConfig.name}.ttf`, fontConfig.alias, 'normal');
      doc.setFont(fontConfig.alias);
      return;
    }

    // 回退方案：尝试从public目录加载字体文件
    const fontPath = '/fonts/SourceHanSansCN-Regular.ttf';
    
    try {
      const response = await fetch(fontPath);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
        
        doc.addFileToVFS('SourceHanSansCN-Regular.ttf', base64);
        doc.addFont('SourceHanSansCN-Regular.ttf', 'SourceHanSans', 'normal');
        doc.setFont('SourceHanSans');
        console.log('✅ 从public目录加载字体成功');
        return;
      }
    } catch (error) {
      console.warn('无法从public目录加载字体文件:', error);
    }

    // 如果所有方法都失败，抛出错误
    throw new Error('无法加载中文字体文件。请运行 npm run convert-font 来配置字体文件。');
  } catch (error) {
    console.error('加载中文字体失败:', error);
    throw error;
  }
}

/**
 * 检查字体是否已加载
 */
export function isChineseFontLoaded(doc: jsPDF): boolean {
  try {
    const fonts = (doc as any).getFontList();
    return fonts && (
      fonts['SourceHanSans'] || 
      fonts['SimSun'] || 
      fonts['SimHei'] ||
      fonts['MicrosoftYaHei']
    );
  } catch {
    return false;
  }
}

/**
 * 从本地文件加载字体（需要用户手动提供Base64编码）
 * @param doc jsPDF实例
 * @param fontName 字体文件名
 * @param fontAlias 字体别名
 * @param base64Data Base64编码的字体数据
 */
export function loadFontFromBase64(
  doc: jsPDF,
  fontName: string,
  fontAlias: string,
  base64Data: string
): void {
  try {
    doc.addFileToVFS(`${fontName}.ttf`, base64Data);
    doc.addFont(`${fontName}.ttf`, fontAlias, 'normal');
    doc.setFont(fontAlias);
  } catch (error) {
    console.error('加载字体失败:', error);
    throw error;
  }
}

