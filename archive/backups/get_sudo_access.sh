#!/bin/bash
# 获取sudo权限的脚本

echo "🔐 获取sudo权限脚本"
echo "===================="

# 方法1: 直接提示用户输入密码
echo "方法1: 直接输入密码"
echo "请在下面输入您的密码:"
sudo -v
if [ $? -eq 0 ]; then
    echo "✅ sudo权限获取成功"
    echo "现在可以安装Homebrew了..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "❌ sudo权限获取失败"
fi

# 方法2: 使用expect脚本（如果方法1失败）
echo ""
echo "方法2: 使用expect脚本"
echo "请提供您的密码:"
read -s password
echo "$password" | sudo -S -v
if [ $? -eq 0 ]; then
    echo "✅ sudo权限获取成功"
    echo "现在可以安装Homebrew了..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "❌ sudo权限获取失败"
fi
