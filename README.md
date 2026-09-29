# Le Weilai 餐厅服务系统

本项目采用前后端分离结构：`web/` 是通过 JSON API 工作的浏览器界面，`server/` 是 Node.js 服务与 SQLite 数据库。仓库已提供 Docker Compose 与 `deploy.sh`，可一条命令部署到有域名的小型 VPS。`public_site/` 是先前的静态 GitHub Pages 演示；GitHub Pages 不运行本项目所需的 Node.js 数据库服务。

## 本地启动

需要 Node.js 24 或更高版本。无需安装 npm 依赖。

```powershell
npm start
```

打开 <http://127.0.0.1:8766/>。首次启动创建 `data/restaurant.sqlite`，导入默认菜单和桌位，没有营业订单。服务默认只监听本机，并允许本机直接使用。

查看样例单时运行：

```powershell
npm run demo
```

演示模式使用独立的 `data/demo.sqlite`。首次运行创建一张进行中的堂食单、一张自动完单并释放桌位的历史服务单，以及一张打包单。之后重启仍保留操作结果；需要全新演示数据库时，停止服务后移动或删除 `data/demo.sqlite`、`data/demo.sqlite-wal` 和 `data/demo.sqlite-shm`。

端口被占用时可设置 `PORT` 环境变量。本地正式库、演示库、备份都被 Git 忽略，不会发布到 GitHub Pages。

## 流程

1. 点单页选择桌号并输入人数，或使用右侧独立打包入口。桌号固定为室内 `1 2 3 5 6 8 9 10 11 12`，露台 `T1 T2`。
2. 搜索菜单、设置份数和备注、确认发送。服务器在数据库事务中核对并扣减库存；下单后直接返回桌位页，不弹小票预览。未完单的服务单可加菜、催菜、改菜或退掉未上桌的份数；改菜和退菜会先通知后厨，10 秒后自动处理。
3. 后厨屏只显示中文待做菜品，不显示饮品。每道菜显示已等待分钟数，可一键全屏并在侧栏汇总同菜总数。催菜会语音播报桌号并让整张桌单卡片持续闪烁，菜品上桌后从后厨移除；改菜和退菜会语音提示并显示红色闪烁提醒。点单、划单和提醒通过服务端事件实时同步。
4. 出菜口始终显示中法双语。菜品可逐份上桌，也可一键上桌；已上桌的菜品仍保留在服务单中查看。全部上齐后点 **完单**，服务单随即结束，桌位自动释放。
5. 堂食服务单支持转到空桌或并入已有服务单。后台查看历史和操作日志；每条操作日志记录操作员工与时间。管理员用管理员 PIN 解锁后台，可添加员工姓名、代号和个人 PIN。

后台可编辑菜单、过敏原、库存、快捷备注、提醒阈值和人员，并可选择次日自动恢复手动设定的库存。小票可由浏览器打印；配置 Epson 后下单会自动发送。界面不显示持续跳动的实时时钟或等待分钟数；订单、日志保留固定的操作时间。

## Epson TM-m30II 自动打印

打印机接入同一网络并启用 ePOS-Print 后，设置 `EPSON_PRINTER_URL` 为打印机的完整 ePOS 地址，例如：

```powershell
$env:EPSON_PRINTER_URL='http://192.168.1.99/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000'
$env:EPSON_PRINT_LANG='fr'
npm start
```

`EPSON_PRINT_LANG` 可设 `fr` 或 `zh`；默认法语。每次新下单自动发送小票，接口会记录打印结果。若打印机没有确认，订单仍保存在数据库，点单端会明确提示，并可从小票预览重打。请在现场验证打印机地址、纸张宽度、中文字符和 HTTPS 证书。打印机位于店内局域网时，未来 VPS 需要有到店内打印机的安全网络路径，或改用店内打印桥接服务。[Epson ePOS-Print XML 官方手册](https://files.support.epson.com/pdf/pos/bulk/epos-print_xml_um_en_rev_af.pdf)

## 局域网本机服务

本机默认免 PIN；如需在本机验证员工登录和后台权限，可设置至少 6 位的 `ADMIN_PIN`。局域网或公网访问必须设置 `ADMIN_PIN`。管理员用该 PIN 登录/解锁后台并创建员工账号，员工使用后台分配的个人 PIN 登录。旧版 `APP_PIN` 仅在还没有启用员工账号时兼容通用员工登录，创建员工账号后会停用。示例：

```powershell
$env:HOST='0.0.0.0'
$env:ADMIN_PIN='请换成另一组管理员PIN'
npm start
```

## 一键部署到 VPS

部署脚本面向装有 Docker Engine、Docker Compose 插件和 `openssl` 的 Linux VPS。先把域名的 DNS A 记录指向 VPS，并在云厂商防火墙和系统防火墙放行入站 TCP 80、TCP 443（可选 UDP 443）。随后运行：

```bash
git clone https://github.com/du669/le-weilai-kds-demo.git le-weilai
cd le-weilai
sudo bash deploy.sh orders.example.com
```

脚本会创建权限为 600 的 `.env`、生成管理员 PIN、构建应用并启动 Caddy HTTPS 反向代理。首次启动时会在终端显示管理员 PIN，请安全保存；进入后台的员工管理页后添加每名员工的个人 PIN。之后可从 VPS 项目目录运行 `sudo cat .env` 查看管理员 PIN，也可参考 `.env.example` 手动配置。Caddy 会为正确解析到 VPS 的域名自动申请和续期 HTTPS 证书。SQLite 数据库、证书和 Caddy 配置存放在 Docker 持久化卷中。

发布新版本时进入项目目录执行：

```bash
git pull
sudo bash deploy.sh orders.example.com
```

重复运行会沿用现有 PIN 和数据库。不要执行 `docker compose down -v`，该命令会删除数据库卷。

手动管理服务：

```bash
sudo docker compose ps
sudo docker compose logs -f app caddy
sudo docker compose restart app
```

定期备份数据库到 VPS 项目下被 Git 忽略的 `backups/` 目录，并把备份复制到另一处存储：

```bash
sudo bash backup-vps.sh
```

需要自动打印时，在 `.env` 中填写 `EPSON_PRINTER_URL`，然后执行 `sudo docker compose up -d`。如果打印机留在店内局域网，VPS 必须通过 VPN 或店内打印桥安全访问打印机。

## 部署到已有 Nginx 网站的子路径

如果 80/443 端口已由 Nginx 使用，且该域名已经有有效 HTTPS 证书，可运行 `sudo bash deploy-nginx.sh your-domain.example`。它会将应用限制在本机 `127.0.0.1:8766`，在对应 HTTPS Nginx 站点中加入 `/restaurant/` 反向代理，并保留现有根路径网站。首次自动部署会生成管理员 PIN；查看服务器上的 `.env` 文件获取 PIN，再登录后台添加员工。

仓库中的 `.github/workflows/deploy-vps.yml` 会在推送到 `main` 后通过 SSH 更新服务器代码并运行部署脚本。GitHub 仓库的 **Settings → Secrets and variables → Actions** 中需要设置 `VPS_SSH_PRIVATE_KEY` 和 `VPS_KNOWN_HOSTS` 两个 Secret。工作流假定服务器是 `root@150.158.125.219`，站点域名为 `tripmanager.cn`。

## 数据备份

运行 `npm run backup`，生成 `data/backups/le-weilai-时间.sqlite`。可以在服务运行时执行。需要备份演示库时先设置 `DEMO_SEED=1`。如果自定义数据库位置，备份命令也应设置相同的 `DB_FILE`。`BACKUP_DIR` 可指定备份目录。

## 已知边界

- Epson 自动打印接口已接入，实际出纸需在现场配置和验证打印机 IP、网络及字符集。未配置时使用浏览器打印。
- 网络中断时界面会标记连接中断。服务端收到的订单会持久化，但离线客户端不排队补单。
- PIN 会话保存在服务内存，重启后需要重新登录。正式 VPS 应使用 HTTPS，并做好数据库备份。
- 静态 GitHub Pages 页面是早期独立演示。新的数据库版本需运行 Node.js 服务。
