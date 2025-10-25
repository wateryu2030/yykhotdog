// 选址服务 - 简化版本
export class SiteSelectionService {
  static async getSiteAnalysis(region: string) {
    // 返回模拟数据
    return {
      region,
      analysis: '选址分析结果',
      score: 85
    };
  }
}
