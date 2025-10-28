#!/usr/bin/env python3
"""
阿里云访问密钥配置向导
帮助用户设置阿里云访问密钥
"""

import os
import sys
from pathlib import Path

def setup_credentials():
    """设置阿里云访问密钥"""
    print("🔐 阿里云访问密钥配置向导")
    print("=" * 50)
    
    print("请从阿里云控制台获取以下信息:")
    print("1. 登录阿里云控制台 (https://ecs.console.aliyun.com)")
    print("2. 点击右上角头像 -> AccessKey管理")
    print("3. 创建AccessKey或使用现有AccessKey")
    print("4. 记录AccessKey ID和AccessKey Secret")
    print()
    
    # 获取用户输入
    access_key_id = input("请输入您的AccessKey ID: ").strip()
    access_key_secret = input("请输入您的AccessKey Secret: ").strip()
    
    if not access_key_id or not access_key_secret:
        print("❌ AccessKey ID和Secret不能为空")
        return False
    
    # 设置环境变量
    os.environ['ALIYUN_ACCESS_KEY_ID'] = access_key_id
    os.environ['ALIYUN_ACCESS_KEY_SECRET'] = access_key_secret
    
    # 创建环境变量文件
    env_file = Path(__file__).parent / '.env.aliyun'
    with open(env_file, 'w') as f:
        f.write(f"ALIYUN_ACCESS_KEY_ID={access_key_id}\n")
        f.write(f"ALIYUN_ACCESS_KEY_SECRET={access_key_secret}\n")
    
    print(f"✅ 访问密钥已保存到: {env_file}")
    
    # 更新shell配置文件
    shell_configs = ['~/.zshrc', '~/.bashrc', '~/.bash_profile']
    for config in shell_configs:
        config_path = Path(config).expanduser()
        if config_path.exists():
            with open(config_path, 'a') as f:
                f.write(f"\n# 阿里云访问密钥\n")
                f.write(f"export ALIYUN_ACCESS_KEY_ID='{access_key_id}'\n")
                f.write(f"export ALIYUN_ACCESS_KEY_SECRET='{access_key_secret}'\n")
            print(f"✅ 已添加到: {config}")
            break
    
    return True

def test_connection():
    """测试连接"""
    print("\n🧪 测试阿里云连接...")
    try:
        from aliyunsdkcore.client import AcsClient
        from aliyunsdkrds.request.v20140815 import DescribeDBInstancesRequest
        
        access_key_id = os.getenv('ALIYUN_ACCESS_KEY_ID')
        access_key_secret = os.getenv('ALIYUN_ACCESS_KEY_SECRET')
        
        client = AcsClient(access_key_id, access_key_secret, 'cn-hangzhou')
        request = DescribeDBInstancesRequest.DescribeDBInstancesRequest()
        request.set_PageSize(10)
        
        response = client.do_action_with_exception(request)
        print("✅ 阿里云连接测试成功！")
        return True
        
    except Exception as e:
        print(f"❌ 连接测试失败: {e}")
        print("请检查AccessKey是否正确，以及是否有RDS访问权限")
        return False

def main():
    """主函数"""
    print("🚀 阿里云RDS自动化恢复 - 配置向导")
    print("=" * 60)
    
    # 检查是否已配置
    if os.getenv('ALIYUN_ACCESS_KEY_ID') and os.getenv('ALIYUN_ACCESS_KEY_SECRET'):
        print("✅ 阿里云访问密钥已配置")
        if test_connection():
            print("\n🎉 配置完成！现在可以运行自动恢复脚本:")
            print("python3 auto_restore_rds.py")
            return True
        else:
            print("\n⚠️ 连接测试失败，请重新配置")
            return setup_credentials()
    else:
        print("❌ 阿里云访问密钥未配置")
        if setup_credentials():
            print("\n🔄 重新加载环境变量...")
            # 重新加载环境变量
            env_file = Path(__file__).parent / '.env.aliyun'
            if env_file.exists():
                with open(env_file, 'r') as f:
                    for line in f:
                        if '=' in line:
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value
            
            if test_connection():
                print("\n🎉 配置完成！现在可以运行自动恢复脚本:")
                print("python3 auto_restore_rds.py")
                return True
            else:
                print("\n⚠️ 连接测试失败，请检查配置")
                return False
        else:
            return False

if __name__ == "__main__":
    main()
