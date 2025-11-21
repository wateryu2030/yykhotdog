/**
 * 中文字体加载工具
 * 用于pdfkit生成PDF时支持中文显示
 */
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

// 字体文件路径配置
const FONT_DIR = path.join(__dirname, '../../fonts');
const FONT_PATHS = {
  regular: path.join(FONT_DIR, 'SourceHanSansCN-Regular.ttf'),
  bold: path.join(FONT_DIR, 'SourceHanSansCN-Bold.ttf'),
  // 备选字体
  simsun: path.join(FONT_DIR, 'SimSun.ttf'),
  simhei: path.join(FONT_DIR, 'SimHei.ttf')
};

/**
 * 检查字体文件是否存在
 */
export function checkFontFile(fontType: 'regular' | 'bold' | 'simsun' | 'simhei' = 'regular'): string | null {
  const fontPath = FONT_PATHS[fontType];
  
  if (fs.existsSync(fontPath)) {
    return fontPath;
  }
  
  // 尝试其他备选字体
  if (fontType !== 'regular') {
    const regularPath = FONT_PATHS.regular;
    if (fs.existsSync(regularPath)) {
      return regularPath;
    }
  }
  
  // 尝试系统字体路径（macOS）
  const systemFontPaths = [
    '/System/Library/Fonts/Supplemental/PingFang.ttc',
    '/System/Library/Fonts/STSong.ttc',
    '/Library/Fonts/Arial Unicode.ttf',
    // Windows常见路径（在WSL或Windows环境中）
    'C:/Windows/Fonts/simsun.ttc',
    'C:/Windows/Fonts/simhei.ttf',
    // Linux常见路径
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ];
  
  for (const systemPath of systemFontPaths) {
    if (fs.existsSync(systemPath)) {
      logger.info(`使用系统字体: ${systemPath}`);
      return systemPath;
    }
  }
  
  return null;
}

/**
 * 获取中文字体路径（自动选择可用字体）
 */
export function getChineseFontPath(): string | null {
  // 按优先级尝试字体
  const fontTypes: Array<'regular' | 'bold' | 'simsun' | 'simhei'> = ['regular', 'simsun', 'simhei', 'bold'];
  
  for (const fontType of fontTypes) {
    const fontPath = checkFontFile(fontType);
    if (fontPath) {
      return fontPath;
    }
  }
  
  return null;
}

/**
 * 初始化字体目录和文件
 */
export function initFontDirectory(): void {
  if (!fs.existsSync(FONT_DIR)) {
    fs.mkdirSync(FONT_DIR, { recursive: true });
    logger.info(`创建字体目录: ${FONT_DIR}`);
  }
}

/**
 * 检查字体是否可用
 */
export function isChineseFontAvailable(): boolean {
  return getChineseFontPath() !== null;
}

/**
 * 获取字体信息（用于日志）
 */
export function getFontInfo(): { available: boolean; fontPath: string | null } {
  const fontPath = getChineseFontPath();
  return {
    available: fontPath !== null,
    fontPath
  };
}

