#!/usr/bin/env python3
"""
修复数据库恢复问题
1. 删除现有的空数据库
2. 重新执行恢复任务
"""
import subprocess
import json
import time

def delete_database(db_name):
    """删除数据库"""
    print(f"🗑️  删除数据库: {db_name}")
    try:
        cmd = (
            f"aliyun rds DeleteDatabase "
            f"--region cn-hangzhou "
            f"--DBInstanceId rm-uf660d00xovkm30678o "
            f"--DBName {db_name}"
        )
        
        result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            print(f"  ✅ 数据库 {db_name} 删除成功")
            return True
        else:
            print(f"  ❌ 删除失败: {result.stderr}")
            return False
    except Exception as e:
        print(f"  ❌ 删除异常: {e}")
        return False

def create_restore_task(db_name, backup_file):
    """创建恢复任务"""
    print(f"🔄 创建恢复任务: {db_name}")
    try:
        cmd = (
            "aliyun rds CreateDatabaseRestoreTask "
            "--region cn-hangzhou "
            "--DBInstanceId rm-uf660d00xovkm30678o "
            f"--DatabaseName {db_name} "
            f"--BackupFile oss://yykhotdog-backup-temp/backups/{backup_file} "
            "--RestoreType OPEN_DATABASE"
        )
        
        result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        print(f"  🔍 命令输出: {result.stdout}")
        print(f"  🔍 错误输出: {result.stderr}")
        if result.returncode == 0:
            if result.stdout.strip():
                try:
                    response = json.loads(result.stdout)
                    task_id = response.get('TaskId', 'Unknown')
                    print(f"  ✅ 恢复任务创建成功，任务ID: {task_id}")
                    return task_id
                except json.JSONDecodeError:
                    print(f"  ⚠️  JSON解析失败，但命令执行成功")
                    return "Unknown"
            else:
                print(f"  ✅ 恢复任务创建成功（无返回数据）")
                return "Success"
        else:
            print(f"  ❌ 创建任务失败: {result.stderr}")
            return None
    except Exception as e:
        print(f"  ❌ 创建任务异常: {e}")
        return None

def check_restore_status(task_id):
    """检查恢复状态"""
    print(f"🔍 检查恢复状态: {task_id}")
    try:
        cmd = (
            "aliyun rds DescribeDBInstanceRestoreTask "
            "--region cn-hangzhou "
            "--DBInstanceId rm-uf660d00xovkm30678o "
            f"--TaskId {task_id}"
        )
        
        result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            response = json.loads(result.stdout)
            status = response.get('Status', 'Unknown')
            print(f"  📊 恢复状态: {status}")
            return status
        else:
            print(f"  ❌ 检查状态失败: {result.stderr}")
            return None
    except Exception as e:
        print(f"  ❌ 检查状态异常: {e}")
        return None

def main():
    """主函数"""
    print("🚀 开始修复数据库恢复问题")
    print("=" * 50)
    
    # 要处理的数据库
    databases = [
        {"name": "cyrg2025", "backup": "cyrg20251117.bak"},
        {"name": "cyrgweixin", "backup": "zhkj20251117.bak"}
    ]
    
    task_ids = []
    
    # 第一步：删除现有空数据库
    print("\n📋 第一步：删除现有空数据库")
    for db in databases:
        delete_database(db["name"])
        time.sleep(2)  # 等待删除完成
    
    print("\n⏳ 等待数据库删除完成...")
    time.sleep(10)
    
    # 第二步：创建恢复任务
    print("\n📋 第二步：创建恢复任务")
    for db in databases:
        task_id = create_restore_task(db["name"], db["backup"])
        if task_id:
            task_ids.append({"name": db["name"], "task_id": task_id})
        time.sleep(2)
    
    # 第三步：监控恢复状态
    print("\n📋 第三步：监控恢复状态")
    if task_ids:
        print("⏳ 恢复任务正在执行，请等待...")
        print("💡 您可以在阿里云控制台查看详细进度")
        
        for task in task_ids:
            print(f"\n🔍 检查 {task['name']} 恢复状态:")
            status = check_restore_status(task['task_id'])
            if status:
                print(f"  📊 当前状态: {status}")
    
    print("\n🎉 恢复任务已创建!")
    print("💡 请等待5-20分钟让恢复任务完成")
    print("💡 您可以在阿里云控制台查看详细进度")

if __name__ == "__main__":
    main()
