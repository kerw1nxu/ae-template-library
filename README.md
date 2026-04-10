# AE Template Library

局域网内使用的 AE 模板站点，支持：

- 模板名称搜索
- 标签筛选
- 卡片封面展示
- 鼠标悬停高速预览
- 模板详情页视频播放
- 模板下载
- 手工上传模板
- 扫描现有模板目录导入
- 详情页后补标签

## 运行要求

- Node.js 22
- npm
- 一个可写的 SQLite 路径
- 一个模板素材目录
- 如果要导入存量模板，还需要一个扫描目录

## 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

默认内容：

```env
PORT=3000
DATABASE_PATH=/var/lib/ae-template-site/db.sqlite
STORAGE_ROOT=/mnt/ae-templates
SCAN_ROOT=/mnt/ae-templates/imports
SITE_ORIGIN=http://127.0.0.1:3000
```

说明：

- `DATABASE_PATH`：SQLite 文件位置
- `STORAGE_ROOT`：上传后的模板存储根目录
- `SCAN_ROOT`：旧模板扫描导入根目录
- `SITE_ORIGIN`：站点访问地址

## 本地开发

```powershell
npm.cmd install
npm.cmd run seed
npm.cmd run build
npm.cmd run start
```

## 存量模板目录规范

扫描导入时，目录规则固定为：

```text
imports/
  红色字幕条角标人名条/
    封面图.jpg
    演示视频.mp4
    工程文件.aep
  医院年度总结片头/
    画面预览.png
    成片预览.mov
    工程打包.zip
```

规则：

- 一级目录名就是模板名
- 每个模板一个文件夹
- 自动识别第一个图片文件作为封面
- 自动识别第一个视频文件作为预览
- 自动识别第一个 `.zip` / `.aep` / `.aet` / `.rar` / `.7z` 作为模板文件
- 文件名可以任意，不需要重命名为 `cover` / `preview` / `template`
- 如果同类文件有多个，只取第一个匹配文件

## 使用 `debian-12-standard_12.7-1_amd64.tar.zst` 在 PVE 部署

### 1. 创建 Debian 12 LXC

在 PVE Web：

1. 点击 `Create CT`
2. `CT ID` 例如：`120`
3. `Hostname`：`ae-template-site`
4. 设置 root 密码
5. Template 选择：
   - `local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst`
6. Disk：
   - `40GB`
7. CPU：
   - `2 cores`
8. Memory：
   - `4096 MB`
   - `Swap 1024 MB`
9. Network：
   - Bridge：`vmbr0`
   - IPv4：固定 IP，例如 `192.168.1.120/24`
   - Gateway：你的局域网网关
10. DNS：
   - 路由器 DNS 或公共 DNS
11. 启动容器

推荐：

- 第一版先按普通 LXC 跑
- `Unprivileged` 可以开
- 如果 NFS 权限后续有问题，再调整映射

### 2. 初始化容器

进入 LXC 控制台：

```bash
apt update
apt upgrade -y
apt install -y curl ca-certificates git build-essential nfs-common
```

安装 Node.js 22：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v
npm -v
```

### 3. 在 TrueNAS 准备数据集

建议创建数据集：

- `ae-template-library`

目录结构建议：

```text
ae-template-library/
  templates/
  imports/
  backups/
    sqlite/
```

说明：

- `templates/`：站点上传模板目录
- `imports/`：已有模板扫描导入目录
- `backups/sqlite/`：数据库备份目录

然后在 TrueNAS 开启 NFS 共享，并授权给 LXC 的固定 IP。

### 4. 在 LXC 挂载 NFS

```bash
mkdir -p /mnt/ae-templates
mount -t nfs TRUENAS_IP:/mnt/POOL_NAME/ae-template-library /mnt/ae-templates
ls -la /mnt/ae-templates
```

如果能看到 `templates`、`imports`、`backups`，说明挂载成功。

然后写入 `/etc/fstab`：

```fstab
TRUENAS_IP:/mnt/POOL_NAME/ae-template-library /mnt/ae-templates nfs defaults,_netdev 0 0
```

应用：

```bash
mount -a
```

### 5. 上传项目到 LXC

创建目录：

```bash
mkdir -p /opt/ae-template-site
mkdir -p /var/lib/ae-template-site
```

然后把当前项目放到：

```text
/opt/ae-template-site
```

可选方式：

- 用 WinSCP / scp 上传压缩包后解压
- 或直接 Git clone

最终要求：

- `/opt/ae-template-site/package.json`
- `/opt/ae-template-site/app`
- `/opt/ae-template-site/deploy`

都存在。

### 6. 配置环境变量

```bash
cd /opt/ae-template-site
cp .env.example .env.local
```

编辑 `.env.local`：

```env
PORT=3000
DATABASE_PATH=/var/lib/ae-template-site/db.sqlite
STORAGE_ROOT=/mnt/ae-templates
SCAN_ROOT=/mnt/ae-templates/imports
SITE_ORIGIN=http://192.168.1.120:3000
```

### 7. 安装依赖并构建

```bash
cd /opt/ae-template-site
npm install
npm run seed
npm run build
```

检查：

- `npm install` 成功
- `npm run seed` 成功
- `npm run build` 成功

数据库应出现在：

```text
/var/lib/ae-template-site/db.sqlite
```

### 8. 先手动启动验证

```bash
cd /opt/ae-template-site
npm run start
```

在你的电脑浏览器打开：

```text
http://192.168.1.120:3000
```

需要验证：

- 首页能打开
- 上传抽屉能打开
- 模板详情页能打开
- 标签编辑抽屉能打开
- `/api/tags` 正常
- `/api/templates` 正常
- 扫描目录功能正常

### 9. 配置 systemd

项目自带服务文件：

```text
deploy/ae-template-site.service
```

复制到系统目录：

```bash
cp /opt/ae-template-site/deploy/ae-template-site.service /etc/systemd/system/ae-template-site.service
systemctl daemon-reload
systemctl enable ae-template-site
systemctl start ae-template-site
systemctl status ae-template-site
```

查看日志：

```bash
journalctl -u ae-template-site -f
```

### 10. 配置 SQLite 备份

```bash
chmod +x /opt/ae-template-site/deploy/backup-db.sh
DATABASE_PATH=/var/lib/ae-template-site/db.sqlite BACKUP_DIR=/mnt/ae-templates/backups/sqlite /opt/ae-template-site/deploy/backup-db.sh
```

确认已生成：

```text
/mnt/ae-templates/backups/sqlite/db-YYYYMMDD-HHMMSS.sqlite
```

加入 crontab：

```bash
crontab -e
```

```cron
0 3 * * * DATABASE_PATH=/var/lib/ae-template-site/db.sqlite BACKUP_DIR=/mnt/ae-templates/backups/sqlite /opt/ae-template-site/deploy/backup-db.sh
```

## 上线检查清单

上线当天建议按这个顺序验收：

1. LXC 重启后，NFS 自动挂载成功
2. `systemctl status ae-template-site` 为 `active (running)`
3. 首页可访问
4. 上传模板成功
5. 下载模板成功
6. 标签编辑成功
7. 扫描旧模板成功
8. SQLite 备份脚本手动执行成功

## 当前限制

- 第一版不接入登录
- 第一版不做 HTTPS
- 第一版不做反向代理
- 第一版不做 AE 插件
