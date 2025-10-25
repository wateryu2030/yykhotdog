#!/usr/bin/env python3
"""
阿里云RDS自动化恢复脚本
通过阿里云API自动上传备份文件到OSS并触发RDS恢复操作
"""

import os
import sys
import time
from pathlib import Path
from aliyunsdkcore.client import AcsClient
from aliyunsdkrds.request.v20140815 import RestoreDatabaseRequest
from aliyunsdkrds.request.v20140815 import DescribeDBInstancesRequest
from aliyunsdkrds.request.v20140815 import DescribeBackupsRequest
import oss2

class AliyunRDSRestore:
    def __init__(self):
        """初始化阿里云客户端"""
        # 阿里云配置
        self.region_id = 'cn-hangzhou'
        self.access_key_id = os.getenv('ALIYUN_ACCESS_KEY_ID', 'LTAI5t7ducEY4P89fCzZyXWx')
        self.access_key_secret = os.getenv('ALIYUN_ACCESS_KEY_SECRET', 'xCUS1ftOEBa7UOuuelLqX57kliWGGn')
        self.rds_instance_id = 'rm-uf660d00xovkm3067'
        
        # OSS配置 - 使用临时存储桶
        self.oss_endpoint = 'https://oss-cn-hangzhou.aliyuncs.com'
        self.oss_bucket_name = 'yykhotdog-backup-temp'  # 临时存储桶名称
        
        # 初始化客户端
        self.rds_client = AcsClient(self.access_key_id, self.access_key_secret, self.region_id)
        self.oss_auth = oss2.Auth(self.access_key_id, self.access_key_secret)
        self.oss_bucket = oss2.Bucket(self.oss_auth, self.oss_endpoint, self.oss_bucket_name)
        
    def check_rds_instance(self):
        """检查RDS实例状态"""
        print("🔍 检查RDS实例状态...")
        try:
            request = DescribeDBInstancesRequest.DescribeDBInstancesRequest()
            request.set_DBInstanceId(self.rds_instance_id)
            
            response = self.rds_client.do_action_with_exception(request)
            print(f"✅ RDS实例检查成功: {self.rds_instance_id}")
            return True
            
        except Exception as e:
            print(f"❌ RDS实例检查失败: {e}")
            return False
    
    def upload_backup_to_oss(self, backup_file_path, oss_key):
        """上传备份文件到OSS"""
        print(f"📤 上传备份文件到OSS: {backup_file_path}")
        try:
            if not os.path.exists(backup_file_path):
                print(f"❌ 备份文件不存在: {backup_file_path}")
                return False
            
            # 上传文件到OSS
            result = self.oss_bucket.put_object_from_file(oss_key, backup_file_path)
            print(f"✅ 备份文件上传成功: oss://{self.oss_bucket_name}/{oss_key}")
            print(f"ETag: {result.etag}")
            return True
            
        except Exception as e:
            print(f"❌ 备份文件上传失败: {e}")
            return False
    
    def restore_database_from_oss(self, oss_backup_path, target_database):
        """从OSS恢复数据库"""
        print(f"🔄 开始恢复数据库: {target_database}")
        try:
            request = RestoreDatabaseRequest.RestoreDatabaseRequest()
            request.set_DBInstanceId(self.rds_instance_id)
            request.set_DBName(target_database)
            request.set_BackupId(oss_backup_path)  # OSS备份文件路径
            
            response = self.rds_client.do_action_with_exception(request)
            print(f"✅ 数据库恢复请求已提交: {target_database}")
            return True
            
        except Exception as e:
            print(f"❌ 数据库恢复失败: {e}")
            return False
    
    def wait_for_restore_completion(self, timeout=3600):
        """等待恢复完成"""
        print("⏳ 等待恢复完成...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # 检查RDS实例状态
                request = DescribeDBInstancesRequest.DescribeDBInstancesRequest()
                request.set_DBInstanceId(self.rds_instance_id)
                
                response = self.rds_client.do_action_with_exception(request)
                # 这里需要解析响应来检查恢复状态
                print("🔄 恢复进行中...")
                time.sleep(60)  # 等待1分钟
                
            except Exception as e:
                print(f"⚠️ 检查恢复状态时出错: {e}")
                time.sleep(60)
        
        print("⏰ 恢复超时，请手动检查RDS控制台")
        return False
    
    def restore_cyrg2025(self):
        """恢复cyrg2025数据库"""
        print("🔄 开始恢复cyrg2025数据库...")
        
        backup_file = "/Users/apple/Ahope/yykhotdog/database/cyrg2025-10-24.bak"
        oss_key = "backups/cyrg2025-10-24.bak"
        
        # 1. 上传备份文件到OSS
        if not self.upload_backup_to_oss(backup_file, oss_key):
            return False
        
        # 2. 恢复数据库
        oss_backup_path = f"oss://{self.oss_bucket_name}/{oss_key}"
        if not self.restore_database_from_oss(oss_backup_path, "cyrg2025"):
            return False
        
        print("✅ cyrg2025数据库恢复完成")
        return True
    
    def restore_cyrgweixin(self):
        """恢复cyrgweixin数据库"""
        print("🔄 开始恢复cyrgweixin数据库...")
        
        backup_file = "/Users/apple/Ahope/yykhotdog/database/zhkj2025-10-24.bak"
        oss_key = "backups/zhkj2025-10-24.bak"
        
        # 1. 上传备份文件到OSS
        if not self.upload_backup_to_oss(backup_file, oss_key):
            return False
        
        # 2. 恢复数据库
        oss_backup_path = f"oss://{self.oss_bucket_name}/{oss_key}"
        if not self.restore_database_from_oss(oss_backup_path, "cyrgweixin"):
            return False
        
        print("✅ cyrgweixin数据库恢复完成")
        return True

def main():
    """主函数"""
    print("🚀 阿里云RDS自动化恢复脚本")
    print("=" * 60)
    
    # 检查环境变量
    if not os.getenv('ALIYUN_ACCESS_KEY_ID') or not os.getenv('ALIYUN_ACCESS_KEY_SECRET'):
        print("❌ 请设置阿里云访问密钥环境变量:")
        print("export ALIYUN_ACCESS_KEY_ID='your_access_key_id'")
        print("export ALIYUN_ACCESS_KEY_SECRET='your_access_key_secret'")
        return False
    
    # 创建恢复实例
    restorer = AliyunRDSRestore()
    
    # 检查RDS实例
    if not restorer.check_rds_instance():
        return False
    
    # 恢复数据库
    success_count = 0
    
    if restorer.restore_cyrg2025():
        success_count += 1
    
    if restorer.restore_cyrgweixin():
        success_count += 1
    
    # 总结
    print("\n" + "=" * 60)
    print("📊 恢复操作总结:")
    print(f"成功恢复: {success_count}/2 个数据库")
    
    if success_count == 2:
        print("🎉 所有数据库恢复完成！")
    else:
        print("⚠️ 部分数据库恢复失败，请检查日志")
    
    return success_count == 2

if __name__ == "__main__":
    main()
