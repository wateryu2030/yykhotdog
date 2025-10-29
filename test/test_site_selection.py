#!/usr/bin/env python3
"""
智能化选址功能测试脚本
测试增强版选址分析服务和机器学习预测功能
"""

import requests
import json
import time
from typing import Dict, Any

# API基础URL
BASE_URL = "http://localhost:3001/api/site-selection"

# 测试数据
TEST_LOCATIONS = [
    "北京市朝阳区望京SOHO",
    "上海市浦东新区陆家嘴",
    "广州市天河区珠江新城",
    "深圳市南山区科技园",
    "成都市武侯区天府软件园",
    "杭州市西湖区文三路",
    "南京市鼓楼区新街口",
    "武汉市江汉区江汉路"
]

def test_site_analysis(location: str) -> Dict[str, Any]:
    """测试单个位置选址分析"""
    print(f"\n🔍 测试选址分析: {location}")
    
    try:
        response = requests.post(f"{BASE_URL}/analyze", json={
            "location": location,
            "includeMLPrediction": True
        }, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                result = data['data']
                print(f"✅ 分析成功")
                print(f"   总分: {result['scores']['overallScore']}")
                print(f"   POI密度: {result['scores']['poiDensity']}")
                print(f"   人口密度: {result['scores']['populationDensity']}")
                print(f"   交通便利性: {result['scores']['trafficAccessibility']}")
                print(f"   竞争水平: {result['scores']['competitionLevel']}")
                print(f"   预期收入: ¥{result['predictions']['expectedRevenue']:,}")
                print(f"   置信度: {result['predictions']['confidence']}")
                print(f"   风险等级: {result['analysis']['riskLevel']}")
                print(f"   建议: {', '.join(result['analysis']['recommendations'][:2])}")
                return result
            else:
                print(f"❌ 分析失败: {data.get('message', '未知错误')}")
                return None
        else:
            print(f"❌ HTTP错误: {response.status_code}")
            return None
            
    except requests.exceptions.Timeout:
        print(f"⏰ 请求超时")
        return None
    except requests.exceptions.ConnectionError:
        print(f"🔌 连接错误")
        return None
    except Exception as e:
        print(f"❌ 异常: {str(e)}")
        return None

def test_ml_prediction(location: str) -> Dict[str, Any]:
    """测试机器学习预测"""
    print(f"\n🤖 测试机器学习预测: {location}")
    
    try:
        response = requests.post(f"{BASE_URL}/ml-predict", json={
            "location": location,
            "longitude": 116.3974,  # 默认坐标
            "latitude": 39.9093
        }, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                prediction = data['data']['prediction']
                print(f"✅ 预测成功")
                print(f"   预测收入: ¥{prediction['predictedRevenue']:,}")
                print(f"   预测订单: {prediction['predictedOrders']}")
                print(f"   预测客户: {prediction['predictedCustomers']}")
                print(f"   置信度: {prediction['confidence']}")
                print(f"   成功概率: {prediction['successProbability']}%")
                print(f"   风险等级: {prediction['riskLevel']}")
                print(f"   风险因素: {', '.join(prediction['riskFactors'][:2])}")
                return prediction
            else:
                print(f"❌ 预测失败: {data.get('message', '未知错误')}")
                return None
        else:
            print(f"❌ HTTP错误: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ 异常: {str(e)}")
        return None

def test_location_comparison(locations: list) -> Dict[str, Any]:
    """测试多位置对比分析"""
    print(f"\n📊 测试多位置对比分析")
    
    try:
        response = requests.post(f"{BASE_URL}/compare", json={
            "locations": locations[:4]  # 只测试前4个位置
        }, timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                comparison = data['data']['comparison']
                print(f"✅ 对比分析成功")
                print(f"   最佳位置: {comparison['bestOverall']}")
                print(f"   最佳评分: {comparison['bestScore']}")
                print(f"   最差位置: {comparison['worstOverall']}")
                print(f"   最差评分: {comparison['worstScore']}")
                print(f"   关键洞察: {', '.join(comparison['keyInsights'][:2])}")
                return comparison
            else:
                print(f"❌ 对比分析失败: {data.get('message', '未知错误')}")
                return None
        else:
            print(f"❌ HTTP错误: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ 异常: {str(e)}")
        return None

def test_model_training() -> bool:
    """测试模型训练"""
    print(f"\n🎓 测试模型训练")
    
    try:
        response = requests.post(f"{BASE_URL}/train-model", timeout=120)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"✅ 模型训练成功")
                print(f"   模型类型: {data['data']['modelType']}")
                print(f"   训练完成: {data['data']['trainingCompleted']}")
                return True
            else:
                print(f"❌ 模型训练失败: {data.get('message', '未知错误')}")
                return False
        else:
            print(f"❌ HTTP错误: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 异常: {str(e)}")
        return False

def test_statistics() -> Dict[str, Any]:
    """测试统计信息"""
    print(f"\n📈 测试统计信息")
    
    try:
        response = requests.get(f"{BASE_URL}/statistics", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                stats = data['data']['overview']
                print(f"✅ 统计信息获取成功")
                print(f"   总分析数: {stats['total_analyses']}")
                print(f"   平均评分: {stats['avg_score']}")
                print(f"   最高评分: {stats['max_score']}")
                print(f"   最低评分: {stats['min_score']}")
                print(f"   优秀数量: {stats['excellent_count']}")
                print(f"   分析城市: {stats['cities_analyzed']}")
                return stats
            else:
                print(f"❌ 统计信息获取失败: {data.get('message', '未知错误')}")
                return None
        else:
            print(f"❌ HTTP错误: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ 异常: {str(e)}")
        return None

def test_history() -> Dict[str, Any]:
    """测试历史记录"""
    print(f"\n📚 测试历史记录")
    
    try:
        response = requests.get(f"{BASE_URL}/history?page=1&limit=5", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                records = data['data']['records']
                pagination = data['data']['pagination']
                print(f"✅ 历史记录获取成功")
                print(f"   记录数量: {len(records)}")
                print(f"   总记录数: {pagination['total']}")
                print(f"   总页数: {pagination['pages']}")
                if records:
                    print(f"   最新记录: {records[0]['location_name']} (评分: {records[0]['score']})")
                return data['data']
            else:
                print(f"❌ 历史记录获取失败: {data.get('message', '未知错误')}")
                return None
        else:
            print(f"❌ HTTP错误: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ 异常: {str(e)}")
        return None

def run_performance_test():
    """运行性能测试"""
    print(f"\n⚡ 性能测试")
    
    start_time = time.time()
    successful_tests = 0
    total_tests = 0
    
    # 测试单个分析
    for location in TEST_LOCATIONS[:3]:  # 只测试前3个
        total_tests += 1
        result = test_site_analysis(location)
        if result:
            successful_tests += 1
        time.sleep(1)  # 避免请求过于频繁
    
    # 测试机器学习预测
    total_tests += 1
    ml_result = test_ml_prediction(TEST_LOCATIONS[0])
    if ml_result:
        successful_tests += 1
    
    # 测试对比分析
    total_tests += 1
    comparison_result = test_location_comparison(TEST_LOCATIONS[:4])
    if comparison_result:
        successful_tests += 1
    
    # 测试统计信息
    total_tests += 1
    stats_result = test_statistics()
    if stats_result:
        successful_tests += 1
    
    # 测试历史记录
    total_tests += 1
    history_result = test_history()
    if history_result:
        successful_tests += 1
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"\n📊 性能测试结果:")
    print(f"   总测试数: {total_tests}")
    print(f"   成功测试: {successful_tests}")
    print(f"   成功率: {successful_tests/total_tests*100:.1f}%")
    print(f"   总耗时: {duration:.2f}秒")
    print(f"   平均耗时: {duration/total_tests:.2f}秒/测试")

def main():
    """主测试函数"""
    print("🚀 智能化选址功能测试开始")
    print("=" * 50)
    
    # 检查服务是否可用
    try:
        response = requests.get("http://localhost:3001/health", timeout=5)
        if response.status_code != 200:
            print("❌ 后端服务不可用，请先启动服务")
            return
    except:
        print("❌ 无法连接到后端服务，请先启动服务")
        return
    
    print("✅ 后端服务连接正常")
    
    # 运行各项测试
    test_results = {}
    
    # 1. 测试模型训练
    test_results['model_training'] = test_model_training()
    
    # 2. 测试单个选址分析
    print(f"\n{'='*20} 单个选址分析测试 {'='*20}")
    analysis_results = []
    for location in TEST_LOCATIONS[:3]:
        result = test_site_analysis(location)
        if result:
            analysis_results.append(result)
        time.sleep(1)
    test_results['site_analysis'] = len(analysis_results) > 0
    
    # 3. 测试机器学习预测
    print(f"\n{'='*20} 机器学习预测测试 {'='*20}")
    ml_results = []
    for location in TEST_LOCATIONS[:2]:
        result = test_ml_prediction(location)
        if result:
            ml_results.append(result)
        time.sleep(1)
    test_results['ml_prediction'] = len(ml_results) > 0
    
    # 4. 测试多位置对比
    print(f"\n{'='*20} 多位置对比测试 {'='*20}")
    comparison_result = test_location_comparison(TEST_LOCATIONS[:4])
    test_results['comparison'] = comparison_result is not None
    
    # 5. 测试统计信息
    print(f"\n{'='*20} 统计信息测试 {'='*20}")
    stats_result = test_statistics()
    test_results['statistics'] = stats_result is not None
    
    # 6. 测试历史记录
    print(f"\n{'='*20} 历史记录测试 {'='*20}")
    history_result = test_history()
    test_results['history'] = history_result is not None
    
    # 7. 性能测试
    print(f"\n{'='*20} 性能测试 {'='*20}")
    run_performance_test()
    
    # 输出测试总结
    print(f"\n{'='*50}")
    print("📋 测试总结")
    print(f"{'='*50}")
    
    passed_tests = sum(1 for result in test_results.values() if result)
    total_tests = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"   {test_name}: {status}")
    
    print(f"\n总体结果: {passed_tests}/{total_tests} 测试通过")
    print(f"成功率: {passed_tests/total_tests*100:.1f}%")
    
    if passed_tests == total_tests:
        print("🎉 所有测试通过！智能化选址功能运行正常")
    else:
        print("⚠️ 部分测试失败，请检查相关功能")
    
    print(f"\n{'='*50}")
    print("测试完成")

if __name__ == "__main__":
    main()
