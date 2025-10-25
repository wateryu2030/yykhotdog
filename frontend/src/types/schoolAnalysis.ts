// 学校分析相关类型定义
export interface SchoolAnalysisResult {
  schoolId: string;
  schoolName: string;
  studentCount: number;
  potentialCustomers: number;
  marketShare: number;
  recommendation: string;
}

export interface School {
  id: string;
  name: string;
  address: string;
  studentCount: number;
  location?: {
    lat: number;
    lng: number;
  };
}
