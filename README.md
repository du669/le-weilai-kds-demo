# Le Weilai 餐厅服务系统

本地版本采用前后端分离结构：`web/` 是通过 JSON API 工作的浏览器界面，`server/` 是 Node.js 服务与 SQLite 数据库。`public_site/` 是先前的静态 GitHub Pages 演示，仍可打开，但它不连接新数据库。GitHub Pages 不能运行 Node.js 服务；将来可把本系统部署到小型 VPS。

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

演示模式使用独立的 `data/demo.sqlite`。首次运行创建一张进行中的堂食单、一张已完单待翻台的堂食单和一张打包单。之后重启仍保留操作结果；需要全新演示数据库时，停止服务后移动或删除 `data/demo.sqlite`、`data/demo.sqlite-wal` 和 `data/demo.sqlite-shm`。

端口被占用时可设置 `PORT` 环境变量。本地正式库、演示库、备份都被 Git 忽略，不会发布到 GitHub Pages。

## 流程

1. 点单页选择桌号并输入人数，或使用右侧独立打包入口。桌号固定为室内 `1 2 3 5 6 8 9 10 11 12`，露台 `T1 T2`。
2. 搜索菜单、设置份数和备注、确认发送。服务器在数据库事务中核对并扣减库存。未完单的服务单可加菜、催菜或退掉未上桌的份数。
3. 后厨屏只显示中文菜品，不显示饮品。可一键全屏，点单/划单变化通过服务端事件实时更新。
4. 出菜口始终显示中法双语。逐份标记上桌，饮品也在这里处理。最后一份上桌后，点 **完单**。
5. 完单后仍可在点单页及出菜口看完整菜品，不能再加菜。客人离开时点 **翻台**；打包单点 **交付**。历史服务单仍可在后台查阅，新客人的订单不会和旧单混在一起。

后厨和出菜口有预警/超时显示，出菜口最近一次划单可在 10 秒内撤销。后台可编辑菜单、过敏原、库存、快捷备注、提醒阈值和历史日志，并可选择次日自动恢复手动设定的库存。小票可由浏览器打印；配置 Epson 后下单会自动发送。

## Epson TM-m30II 自动打印

打印机接入同一网络并启用 ePOS-Print 后，设置 `EPSON_PRINTER_URL` 为打印机的完整 ePOS 地址，例如：

```powershell
$env:EPSON_PRINTER_URL='http://192.168.1.99/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000'
$env:EPSON_PRINT_LANG='fr'
npm start
```

`EPSON_PRINT_LANG` 可设 `fr` 或 `zh`；默认法语。每次新下单自动发送小票，接口会记录打印结果。若打印机没有确认，订单仍保存在数据库，点单端会明确提示，并可从小票预览重打。请在现场验证打印机地址、纸张宽度、中文字符和 HTTPS 证书。打印机位于店内局域网时，未来 VPS 需要有到店内打印机的安全网络路径，或改用店内打印桥接服务。[Epson ePOS-Print XML 官方手册](https://files.support.epson.com/pdf/pos/bulk/epos-print_xml_um_en_rev_af.pdf)

## 局域网与 VPS

本机以外访问时必须设置至少 6 位的 `APP_PIN`，可另设 `ADMIN_PIN` 限制菜单、库存和设置修改。示例：

```powershell
$env:HOST='0.0.0.0'
$env:APP_PIN='请换成自己的员工PIN'
$env:ADMIN_PIN='请换成另一组管理员PIN'
npm start
```

在 VPS 上建议使用 `compose.yaml`，将服务仅映射到服务器的 `127.0.0.1:8766`，再通过带 HTTPS 的反向代理开放网站。启动 Compose 前设置 `APP_PIN` 和 `ADMIN_PIN` 环境变量；反向代理使用 HTTPS 时，`COOKIE_SECURE=1` 保证会话 Cookie 仅通过 HTTPS 发送。数据库存于 Docker 卷 `restaurant_data`。请定期备份。

## 数据备份

运行 `npm run backup`，生成 `data/backups/le-weilai-时间.sqlite`。可以在服务运行时执行。需要备份演示库时先设置 `DEMO_SEED=1`。如果自定义数据库位置，备份命令也应设置相同的 `DB_FILE`。`BACKUP_DIR` 可指定备份目录。

## 已知边界

- Epson 自动打印接口已接入，实际出纸需在现场配置和验证打印机 IP、网络及字符集。未配置时使用浏览器打印。
- 网络中断时界面会标记连接中断。服务端收到的订单会持久化，但离线客户端不排队补单。
- PIN 会话保存在服务内存，重启后需要重新登录。正式 VPS 应使用 HTTPS，并做好数据库备份。
- 静态 GitHub Pages 页面是早期独立演示。新的数据库版本需运行 Node.js 服务。
