### Tiny Little Office 的简体中文文字：每个人看到的字符串，“=”左边是标识符，右边是中文。
### 标识符、{ $占位符 }和各组的注释都与 en.ftl 一致；中文没有复数形式，复数只写一种（*[other]），{ $n } 代表数字。

## the shell: header

# en: 57f5f5efbc5990f5230aa95359042338b856707b
shell-menu = 菜单
# en: 768e0c1c69573fb588f61f1308a015c11468e05f
common-title = 标题
# A new document of the app, and one not yet named; { $noun } is the app's noun: "New presentation".
# en: ef9b1a33245907a9a1d7b7c22053168ed660d014
common-new-noun = 新建{ $noun }
# en: bd2ce96ba3cfd14a4c62847d4e6bb0b8a3c72d25
common-untitled-noun = 未命名{ $noun }
# en: a479c9c34e878d07b4d67a73a48f432ad7dc53c8
shell-download = 下载
# en: 33ce417454bfd838897deaeee2355e818a5d4160
shell-loading = 加载中…
# en: 22456f903bcbdedb06221ade9b87febb47722e40
shell-this-link-holds-something-that = 无法读取此链接。它可能在复制时被截断了。
# en: 7dfd19fef00f41e899fb6e2753b71ae40ba59e6d
shell-n-of-max-link-characters = 链接还剩 { $n } / { $max } 个字符
# en: 51a6857d24b72bee0d1e541448d0f9c8fd5b8697
shell-n-characters-over-link-limit = { $n ->
       *[other] 超出链接上限 { $n } 个字符
    }
# en: 1cfbe154225ecb3a01f463f1adde07279f1a454a
shell-n-characters-over-link-limit-short-link-holds-max = 超出链接上限 { $n } 个字符；短链接最多容纳 { $max }
# en: e7722b7943884e579644a3f5bd2b605afd08a156
shell-n-characters-over-what-short = 超出短链接容量 { $n } 个字符
# Before a document that lives nowhere but its link (Private, changed) is left for another place: the question and its three answers.
# en: f0bba930d38a38cacb48e472c8d4856caa4d8fa8
shell-this-document-lives-in-its = 这份文档尚未保存
# en: 43454bfced276b8a1b83dea8a0bef1794a9bde60
shell-nothing-is-saved-on-this = 它只存在于自己的链接中。复制链接即可留住它，或把它保存在此浏览器中。按“返回”也能回到这里。
# en: e0ef0b02c240e569b52e799771dbb4fb07b35818
shell-copy-link-and-go = 复制链接并离开
# en: fdb4eeef33355eb9aed9f11d6ddcdfe0c08a29ea
shell-turn-on-save-in-browser = 在浏览器中保存并离开
# en: 634bae7c8177155bc24961f3493f425b66e88c16
shell-go-without = 不保存并离开
# en: ee7a39c93b7018b92bcff5511a92081df68dd3db
shell-save-in-browser-is-on = “在浏览器中保存”已打开。你打开的文档会保存在这里。可在菜单中关闭。
# en: 97c669558589e3b0cf0917cb9caece8844ba65d9
shell-another-version = 另一个已保存的版本
# en: 87222e82bf5d208052c68fa66c93d131fa18fc67
shell-kept-on-this-device = 已保存到此设备
# en: 266695479a949eec44dea9db4e15fba00163f04e
shell-keyboard-shortcuts = 键盘快捷键
# en: bc447a3151935ceff76e781c90fb02c45d25f004
shell-nothing-to-keep-yet = 还没有可保存的内容
# en: 8c00f9130260156b1612126a7cf9a23bb3c553d6
shell-open-it = 打开
# en: ef6e207cc7cea57220ad9a73fc6040b0085bf63e
shell-save-in-browser-is-off = “在浏览器中保存”已关闭，因此不会保存任何内容。请在菜单中打开它。
# en: 3939d97295147954c5488340b1f427ebbfa51e69
shell-skip-to-apps = 跳到应用
# en: 286b3810e407b3cef40b582c8ca4b373a58445bf
shell-skip-to-document = 跳到文档
# en: 03d9aea1885137ab8ab4d9c24250515cb44161f0
shell-this-device-keeps-another-version = 此设备上保存了“{ $title }”的另一个版本（{ $when }）。
# en: 25c53c58cba7054a3a2ae9e9b575c7888716ae94
shell-this-link-was-made-by = 此链接需要更新的版本。请重新加载页面。

## the home page

# en: 276c9361fff15e60f48af4d733ec83315d2bb251
home-blank = 空白
# en: f25b700ed9f092123a43acb205a6869342cf9dd6
common-templates = 模板
# The button under an app's tile, naming the template list: "Start Text from"
# The list of an app's documents kept on this device, under its tile: "Write documents"
# en: c647789831582ba7f4b6aad72ea6f425b98aad6f
home-app-documents = { $app }文档
# en: f6fdbe48dc54dd86f63097a03bd24094dedd713a
common-forget = 删除
# The button that forgets one kept document: "Forget Launch notes"
# en: bbc98cac8e5e1a213d5aa04b3618196a6d28bf49
home-forget-title = 删除{ $title }
# Under an app's documents, the rest folded away: "3 more"
# en: 84ab0eecfadb6332ee8b1ee5c67852b7df54e66f
home-n-more = 还有 { $n } 个
# en: 7f2352058be05faa9a191d7ac6eb2cf0a15b228f
home-aboard-project-made-with-respect = { $aboard } 的项目。在纽约怀着敬意打造。
# en: a26ce4e876668bb8cdbd6db05cc668d436b73ba6
home-beta-version = 测试版
# en: 84add5b2952787581cb9a8851eef63d1ec75d22b
home-email = 电子邮件
# en: 5b5d9a510b8eb3d8ca42591036a5fb8c0402a674
home-templates-for-app = { $app }的模板
# en: 5c88e1ec022720d6a2199c408f861dd61bfdbb08
home-app-templates = { $app }的模板
# en: 5ea1c79be74b3d7c077d35212d473ca6fbd80c4a
home-templates-for-app-name = { $app }的模板：{ $name }
# en: 9b96d854dd8e79adb3ee6e1e0e419b50fc1aed43
home-templates-are-not-saved-in = 模板还没有保存在此浏览器中。连接互联网即可查看。
# en: 25d37d0580af5bc389b9332f3640f6d73ef93e48
home-documents-found = 找到的文档
# en: 5e46670f6fe68987a7e5c94f03e192aff635df77
home-no-document-here-has-those = 没有匹配的文档
# en: 1dfc2a61eb2345a48a2a91b7922b83f580553732
home-search-your-documents = 搜索你的文档
# en: 4f5fbd7fb6a16b16ebe3c347bf43c9a2455a1560
home-n-documents-found = { $n ->
       *[other] 找到 { $n } 份文档
    }

## the drawer (hamburger menu)

# en: d9a36850b7f3f78365a998cb16cb68b6fd79400d
drawer-apps = 应用
# en: bbfa773e5a63a5ea58c9b6207e608ca0120e592a
common-close = 关闭
# en: d6cbbf296e77dd589e704c39eb4d6575d31a1d22
drawer-default-name = 默认：{ $name }
# en: 1660227e6037ceaaaacebea7ba86a1f92071bd39
drawer-save-in-browser = 在浏览器中保存
# en: dd8082be77e9211f033a55131c1a6360f12b0e1d
drawer-what-is-this = 这是什么？
# en: fa7684f5e02290b9144d9d981add78ff873eb052
drawer-turn-on-to-save-files = 打开后会在浏览器中保存文件。
# en: af191ab94c0b2f93d5e90820805b9c7f419ce80d
drawer-turn-off-to-remove-all = 关闭后会移除所有文件和设置。
# en: db5f691e51583d80782a9c51e78f01c49ccefd02
common-nothing-saved-in-this-browser = 此浏览器中未保存任何内容
# en: 15f47f2fab9454be9fab70ba4bd89293fdc40c0a
common-saving-in-this-browser = 正在此浏览器中保存
# en: 5e543c55dd0832d9cbbdccc9e22011d240080e50
drawer-remove-all-files-and-settings = 要从此浏览器中移除所有文件和设置吗？
# en: 89b86ab0e66f527166d98df92ddbcf5416ed58f6
drawer-language = 语言
# en: a797e30923ac1be590300ce6b08e63b4e6dc6688
common-theme = 主题
# en: 15360c25a66578ad69e81e4c2fc3f0001e8a2258
drawer-match-device = 跟随设备
# en: a36ef8aba22905e2d2efbf1ac1d6230d5761859d
drawer-light = 浅色
# en: ae1ef01432946b8976b9b58575b3390ab7644db2
drawer-dark = 深色
# en: 6b21fb791ac05170893860c248401cd24a59b732
drawer-about = 关于
# en: 515e0d24040d094379cfdc94e3c6c2f63a26f1f6
common-tiny-little-office = 小小办公室
# en: 399d4aacd52f76ac8090ce08a31e550e2123645d
drawer-about-tiny-little-office = 关于小小办公室
# en: 6218d1c0ab69084ed45fb0f022b95f382310184a
drawer-tiny-little-office-is-experiment = 小小办公室是纽约的数字与 AI 战略及软件开发公司 { $aboard } 的一项实验。
# en: 04a1291dcc6e5d304f04516685710a331963f630
drawer-to-reach-out-with-questions = 如有疑问，请{ $email }。
# en: 522edc71559293b5713cff3f13c2dbafd37a56a3
drawer-email-us = 给我们发邮件
# en: 98187f1688112fa57c00a326f526288fa3e6b023
drawer-if-you-find-bugs-please = 如果发现问题，请到我们的 { $github } 提交。
# en: c6651994b242228b647fbbd2a83eccefd957abca
drawer-github-repository = GitHub 仓库
# en: 0fe421942f09b119f9019d2de286f5a43eefd4f3
drawer-all-of-these-notes-these = 这些笔记、这些图画、这些用马克笔写下的句子，都会随时间褪去。唯有短暂的才长存。
# en: 45efc495ed63ce777a86a3f8a9f4475269fb7542
drawer-eugene-ionesco-book = 欧仁·尤内斯库，{ $book }
# en: be1c21d6fe0ae49ef2cea2d317a4967da26d015c
drawer-discoveries = 《发现》
# en: 687c82861c956e47456186f6522cfc8dbadb8ef6
drawer-documents = 文档
# en: a5c79e56eede8d4e922d461872629a01dd41ab77
drawer-find-app-template-or-command = 查找应用、模板或命令
# en: 45e5f3f72e961cb70134ba35f7a27a9620e515f7
drawer-commands = 命令
# en: b993b0c537190bfc94b21360ac5abe51e56be36f
drawer-nothing-by-that-name = 无结果
# en: 85773bc941e47b21f6cc345b225265e3144489be
drawer-add-to-home-screen = 添加到主屏幕
# en: 9b3cbed5c490c07473546a88768ba29b787e9e52
drawer-size-of-everything = 缩放
# en: 943c5ac9fa7766d7c1ebecbc95c4e0d27b4ef9d4
drawer-to-add-tiny-little-office = 要把小小办公室添加到主屏幕：点“分享”，再点“添加到主屏幕”。

## links that leave the site (kit/ui/link-guard.ts)

# The menu button's tooltip: the Office mark is the menu.
# en: 4a48e81d0d023913c2155eb30954f58853a5591d
leave-tiny-little-office-menu = 小小办公室菜单
# The question before a link that leaves the site: "You are leaving Tiny Little Office for" over the site's name, large.
# en: 92ad7c004fe14dea34666631ff31b016eb39ee40
leave-do-you-trust-this-link = 你信任这个链接吗？
# en: 8d85feca3f164857fc84014a8f2ed5cc4846d4c9
leave-you-are-leaving-tiny-little = 你即将离开小小办公室，前往
# en: 50ef68d5c205237951dae42aa775a66480171c46
leave-this-link-writes-email-to = 此链接会向以下地址写一封邮件
# en: 102dce223fdc2f3bbdda71f28108e2a6fdf21710
leave-this-link-calls = 此链接会拨打
# en: afb8b3199e929e5e9f886fdf382599c9d440c71f
leave-not-secure-address-what-you = 这不是安全（HTTPS）地址。你发送的任何内容都可能在传输途中被读取。
# en: 003e4888e77a22c782047c7d26d028c5eca46f1c
leave-whole-address = 完整地址：
# en: fdb31cf3fb383190c6864d4effd5fd6041b330cb
leave-someone-wrote-this-link-into = 这个链接是文档作者加进去的。链接文字可能与实际地址不同。只有在你信任它时才继续。
# en: 2e0b45f2a456e8db55f08d7b65e87593a3e9a140
leave-go = 前往
# en: c0f31f8a18b087fc577cbc50e9d37c68cb16c9ae
leave-links-of-this-kind-do = 这类链接无法在这里打开。
# About's last line, a link to the source of the build the site runs: "Running commit abc1234".
# en: 0eda2175601e6a4148c1c8b3f85c330bc7fbcabf
leave-running-commit-commit = 运行版本 { $commit }
# en: 45469d1ce86c199fb2984929d6c2e408178f7032
leave-this-link-hides-characters-in = 此链接的地址中含有隐藏字符。

## the copy kept on the device (status lines under the switch)

## sharing: the Share dialog (kit/core/shell.ts), where the link fits (kit/share/limits.ts), the arrival banner

# en: 21697833514286cb120912c109ed55e870e44b01
share-copy-opened-in-new-tab = 已在新标签页中打开副本
# en: ae7b279c96200b853008a352fa110ac2565f3dc5
share-edit-link = 编辑链接
# en: 12355fc4c6eeb80306a7fe5199240b694bf2b85e
share-present-link = 放映链接
# en: bba41b4c62a01956942830c32fc1498945c30fcd
share-copy-into-new-document = 复制为新文档
# en: 2f84eea5d45da4f1ce1760b85db18a854f4e1b39
share-copy-link = 复制链接
# en: 6e9d1ebfe7124caf277155d2f57b5a6787f30198
share-copy-of-title = { $title }的副本
# en: 367f9cb75618d64b28286bdc4a5b8a3f4d7092f0
share-encrypted-here-service-holds-only = 在你的浏览器中加密。我们的服务器只保存加密后的链接，并在它过期时删除。
# en: db4fb5a00a9a2172e9d45a362ff1b772884f64b5
share-expires-in-n-days-date = { $n ->
       *[other] { $n } 天
    }后到期（{ $date }）
# en: ae9d408cb75f0f6745c4a64cb802e6442cc299f4
share-expires-in-n-hours-date = { $n ->
       *[other] { $n } 小时
    }后到期（{ $date }）
# en: a202af448924971f4ffb4dc06ed405775781207e
share-expires-in-n-minutes-date = { $n ->
       *[other] { $n } 分钟
    }后到期（{ $date }）
# en: 0ef0475467d903f5adb0297bbc7979b7b0792d0c
share-opens-as-pages-to-read = 以页面形式打开阅读
# en: 8744400a02796b44742f8f5e5b66216821eab90d
share-opens-in-editor = 在编辑器中打开
# en: 7fbbb75c4e853ef0e42da5fe316344fdf1a6143c
common-whoever-opens-this-link-gets = 打开这个链接的每个人都会得到自己的一份副本。他们的修改不会出现在你的副本中。请他们把自己的链接发回给你。
# en: 94b01acececc033463cc7731d659fbcae11c2b47
share-short-link-that-expires = 会过期的短链接
# en: fed3d23d480dd0bfe5a0cfff4d9f3dae7857fbe6
share-this-link-expires-in-n = 此链接将在 { $n ->
       *[other] { $n } 天
    }后过期
# en: 5f55ae03e19eebbbd3a277a7647d0b2ac27c4ec8
share-this-link-expires-in-n-hours = 此链接将在 { $n ->
       *[other] { $n } 小时
    }后过期
# en: a37642996477c73f2e3335a1e06a28d577806b52
share-this-link-expires-in-n-minutes = 此链接将在 { $n ->
       *[other] { $n } 分钟
    }后过期
# en: 04609a8df41f042b261ed7cf06b80c2667badd0e
share-this-link-n-characters-fits = 此链接：{ $n } 个字符，可以放进短信
# en: 822e1dca627d6149b0263bdae6477ca56c62a36c
share-this-link-n-characters-too = 此链接：{ $n } 个字符，对{ $where }来说太长
# en: f9551d11c51a8da0015b0716e3aab327784b2ec2
share-discord-message = Discord 消息
# en: 36dec9aa0b166bef869350675231f78529bbabd8
share-a-qr-code = 二维码
# en: 13be5551761c07ae1735af2e3fbcea08dae3dce3
share-link-in-google-docs = Google 文档中的链接
# en: 66ab040bba28a1d3d5307879564a2bf9ff2ae108
share-telegram-message = Telegram 消息
# en: aba5163784cd5c92d1a33174634785cace589ca8
share-a-short-link = 短链接
# en: c372595cddc6ae62ad3eb2ddfaa7cb6546e4df31
share-small-nfc-sticker = 小型 NFC 贴纸
# en: 7be07ec57c401332cca2718a0d4a6a516b77527f
share-text-message = 短信
# en: 1efc6b2c2c837a8ce7a9054983d97158307b3c0e
share-chrome-and-edge = Chrome 和 Edge
# en: 777a1e3310cf18433544371b9f5422bf0ba0ac80
share-nfc-sticker = NFC 贴纸
# en: 219dd04dbbbc2c0867d0f2c748fdc25f6aba89f2
share-some-browsers = 旧版浏览器
# en: 77437a6dfcf7562798d4a066e19fd698b357c1a8
share-n-short-links-kept-here = { $n ->
       *[other] 此处保留了 { $n } 个短链接
    }
# en: fbdda8ea6ae4f71eb78a8bd78fa2746784806ffe
share-display-link = 展示链接
# en: 54c374d4a68f528c4c4022d195a62e22b4bf57bb
share-opens = 打开方式
# en: c2e98476efb5e35f50dae898c1b56d7085eee7da
share-link-copied = 链接已复制
# en: 4dfbe46077fcd9769d6688a682515a0cf12a7d80
share-could-not-copy = 无法复制
# en: 24897bc1ceb803cb3796e491bc10a252f16a950f
common-share = 分享…
# en: abba02fcdd8b9ce1dde7f39b5b6aa0bd741f0d57
common-qr-code = 二维码
# en: 7f8c79bef572d079a2e70de568104a605b4050cf
common-qr-code-of-this-document = 此文档的二维码
# en: 5987984bd3953aa88448226f480b1c67ad98ab52
share-this-document-is-n-bytes = 此文档有 { $n } 字节，最大的二维码只能容纳 { $max }。缩短 { $over } 字节就能放下。
# en: 716ebea121ec7b8a4dd9ea47314131122cf0aab1
share-this-document-is-n-characters = 此文档有 { $n } 个字符，短链接最多容纳 { $max }。缩短 { $over } 个字符就能放下。
# en: ae5014875f1eec5203f8744323723d2ee679d1cc
share-expires-after = 到期时间
# en: 1e1c72c2e33894ad38b820f1d4ed17ef478067be
share-hour = 一小时
# en: 4286c1f81faa848587ed38925e9b181e939f4998
share-day = 一天
# en: 51e2a8b00255a6db1c49b306e7ac28f2e6ac9a23
share-week = 一周
# en: 6d17c3840dec7c16f42f223c4a5472efbbff08c1
share-month = 一个月
# en: 38c22f9dbdb41d2131b4324b7722c45a1f543420
share-make-short-link = 生成短链接
# en: 94d7d8ee473f817fa4b57737e7a01ec3cd13d4d4
share-making = 正在创建…
# en: 1c6c031b40782efe6b28678fc42d5569cc11e029
share-hundred-links-day-from-one = 已达上限：每个地址每天最多 100 个短链接。请明天再试。
# en: 0b5140c5b10a2b84301b5ef43056b7d89bd2187c
share-short-link-cannot-be-changed = 短链接无法编辑或删除。它会自动过期。
# en: 4d9182a72e391841c2817e9943cf2b07adf70220
share-could-not-shorten-link = 无法缩短链接。
# en: 4c0067d6b6bd96cdab1ae363ce342312a93834fd
share-this-document-is-too-long = 此文档太长，无法生成短链接。
# en: a4d0b704a911979249dd2629e81a0205fab0aa44
share-up-to-hundred-links-day = 每个地址每天最多 100 个短链接。
# en: e963907dac5cd5c017869b4c96c18021c9bd058b
share-remove = 移除
# en: d0517071aa376e797705058bbad4b658954b9930
common-link = 链接
# en: b15dbf0da72e08fcfcf35d2aed0a937335b9cc5e
common-short-link = 短链接
# en: 9095e39b9975250b05476c852d1631a6651924d9
share-new-noun-date-n = 新建{ $noun } { $date } #{ $n }
# Files, compare, posting and embedding: the agent and sharing surface.
# en: 1c2edb3104c7f2adce9ad2a77f3622d1beb0059a
share-mastodon-server-like-mastodon-social = Mastodon 服务器，如 mastodon.social
# en: 64fbd995d3b6b156ee26ae3c03e6516434c34c12
share-change = 更改
# en: 2a07ce9a22d8e5dc1031e531518f04e50855319f
share-copy-embed-code = 复制嵌入代码
# en: c3e1c83e5b4172d3c738e37cb69b76d93ce49b8b
share-copy-show-link = 复制放映链接
# en: ad02e14e2841dfbd22ab2caa12b5541c5b01a53a
share-embed = 嵌入
# en: 4eeede7134d362f371fd18b2d63d3199bb24f01a
share-embed-code-copied = 嵌入代码已复制
# en: 682cbb0f328f16ee213c6b44d7012512b55506b7
share-opens-deck-already-presenting = 打开后直接进入放映状态。
# en: 7858ac3ff63354f37161bd349efe11edd13b89cb
share-post = 发布
# en: c68fca11627c0ac342583c1782892518730cc40b
share-post-link = 发布链接
# en: 82584c3ce64f57a310db6846c65628266a88c44d
share-show-preview-of-first-page = 显示第一页的预览
# en: ac1624e1fa626a4ba8b8ee419f0cf118d53fa480
share-picture-of-first-page-and = 第一页的图片和标题会在我们的服务器上以可读形式保存一个月，以便社交网络获取。文档本身不会。
# en: 6a46f4b4b3f001e64ef9652412aa1ddbdeabc489
share-shared-without-preview-reason = 已分享，但没有预览：{ $reason }
# en: 4def5924266f682e91bcdff1e5ba510a20a36902
share-making-preview = 正在生成预览…
# en: b0e8d8d6d97acaeed4ad09f7b25699817638ae6b
share-page-could-not-be-drawn = 无法绘制页面
# en: b3dcb32d0d95afbd62938ff614915e68ba996861
share-picture-is-over-400-kb = 图片超过 400 KB
# en: 398d796772eebe6fc3207881d76d2cf9f155da3f
share-server-could-not-be-reached = 无法连接服务器
# en: 686fd096a5f35bcfbcdcc5130d1be03e593d7bfa
share-hundred-previews-day-from-one = 同一个地址每天最多一百个预览
# en: 959db3cd3ff1a424890a809f9cf7445f37db3289
share-server-refused-picture = 服务器拒绝了这张图片
# en: af490175b729a82a4315134642a89f1f87681967
share-pages-in-frame-on-another = 在另一个网站的框架中显示这些页面，并附上在这里打开的链接。
# en: 9377de06278eacbdf4a297a82b8eb9aa3d4220c0
share-your-mastodon-server = 你的 Mastodon 服务器
# en: fccb3597262f866e1c1f6a9f20bdd2439a0370b8
share-this-link-n-characters-n-bytes = 此链接：{ $n ->
       *[other] { $n } 个字符
    }，{ $bytes ->
       *[other] { $bytes } 字节
    }
# en: 525f61b6729229b1a8854a9e50bcaa52ea96b131
share-where = 场合
# en: 55f653107f261dcc84be0568f5812694250f2e96
share-max-link-sizes = 链接长度上限
# en: 24d948e4bdbe5b8224bbc0dfbab1923fab00b98e
share-limit = 上限
# en: f9f775ef8d81d0adcdb54a1de51a58a5ab9d24f6
share-fits = 能放下吗
# en: 0e1a1a74c78e1f4b6e8efcb92b18aea677212d76
share-n-characters = { $n ->
       *[other] { $n } 个字符
    }
# en: 1991ca167949231900aa143e63134d2584d8de83
share-n-bytes = { $n ->
       *[other] { $n } 字节
    }
# en: 36f6b0318377bb84249e4845275fa2c4e63ebb37
share-no-published-limit = 未公布
# en: 5397e0583f14f6c88de06b1ef28f460a1fb5b0ae
share-yes = 可以
# en: f37d6e1b1ff2eeb01d7bee0aadef337300b9db53
share-yes-n-left = 可以，剩余 { $n }
# en: 63dfcadd40126551301f363efd454c7d2c610b94
share-no-n-over = 不行，超出 { $n }
# en: d2857acb2857d3f0021e0ffbcfc8730c9a6e2548
share-yes-counts-as-n-of-max = 是，按 { $n }/{ $max } 计

## privacy (kit/share/privacy.ts, kit/ui/privacy-dialog.ts): the password, what the device holds

# The Share dialog's head line: "Created 9 Oct 2026, 14:03 · by Paul".
# en: 07fd5d289286fa4714b3f407db7875fac90b9952
privacy-anyone-with-link-will-need = 任何拿到链接的人都需要密码才能打开。密码无法重置。一旦丢失，文档就没了。
# en: 8c684290ce0b8a8e6cee79a145e17554064a4760
privacy-change-password = 更改密码
# en: 5be0d11b94b1ba25b2579314f6af69649a900cde
privacy-created-date = 创建于 { $date }
# en: 39e64aebf907392389952dded5e20ab4836d876a
privacy-enter-password-to-open-this = 输入密码以打开此文档。
# en: 554393a215e479d023a30091a1394f7ca57690e1
privacy-forget-everything = 全部删除
# en: 715727cdd46f1bd0703c9e846fcdd4f369ef8313
privacy-preview-sent-with-link-to = 随链接发到社交网络的预览是第一页的图片、标题和开头的文字，在我们的服务器上以可读形式保存一个月。文档本身从不会传到那里。
# en: a584ece11551d9b1a79856743236c51aba50c44f
privacy-forget-everything-this-site-keeps = 删除此浏览器中保存的所有内容，并停止保存？你的文档仍然存在于各自的链接里。
# en: a798882f1c31099bb9500e2da62c0874d8dbed78
privacy-locked = 已锁定
# en: a543040c9fee74b4b34282797abbf59e9d2c99b7
common-locked-document = 已锁定的文档
# en: d850ee188c7c55b64bc3624534de5c5051a57dc6
privacy-new-password = 新密码
# en: 1851836868be57a15ca3684a090210f53c7a98f8
privacy-no-password = 没有密码
# en: 6eef6648406c333a4035cd5e60d0bf2ecf2606d7
privacy-none = 无
# en: b1b8530bbd687503cb5486e906942912fb68c231
privacy-opening = 打开中…
# en: 8be3c943b1609fffbfc51aad666d0a04adf83c9d
common-password = 密码
# en: 114bea5817640fe6b9eeec86b939ec0e9a7b6d76
privacy-password-removed = 密码已移除
# en: ad1909e464528c140bf96a21ce9adda2464956c0
privacy-password-set-link-holds-only = 密码已设置。链接现已加密。
# en: dce69146962b392ae2b157aec604eface36e90c0
privacy-password-ellipsis = 密码…
# en: 9dfd349ebee555eb8d652be20dad971cae439eca
privacy-preferences = 偏好设置
# en: cf01481f626d5127ec7732fcbdb29504f08abefd
privacy-privacy = 隐私
# en: cefceeebf3cd6d02ddc7aca8c769881a5341e829
privacy-nothing-saved-in-this-browser = 此浏览器中没有保存任何内容。列出的项目只在这次访问中保留。
# en: 626a605da9dbcd888eadcad13deebd3a64011c0a
privacy-protected-by-password = 受密码保护
# en: acef17d00b9a1b6e1e15e76d27ae53635928a7a6
privacy-remove-password = 移除密码
# en: 788f55b0957b15918c6aba279f4f0377a5a1db90
privacy-sealing = 正在加密…
# en: 94408e41c12e924b82da7ea6e79e5cb69ac9e042
privacy-set-password = 设置密码
# en: f897cb67f049674308a073079bd85ad0649f8c82
privacy-short-links = 短链接
# en: c706d94b54ef0b520420dd58063cfc78bc88c7e3
privacy-set-password-in-share = 在“分享”中设置密码
# en: e546afa59de2ec4b23ca6c4fafbaddac7bab9240
privacy-short-links-made-here-until = 在这里生成的短链接，保留到过期为止。
# en: b556bf027f9123d39581babef7e15564c24866da
privacy-their-names-and-links-for = 名称和链接，显示在主页上。
# en: 5300fdca86b5b32fd463f73704e318a2b8fa9961
privacy-theme-lifetime-of-short-links = 主题和短链接设置。
# en: 0c6a2cfe53459957b6899930a2e5cd46b6541cec
privacy-this-document-has-password-link = 此文档设有密码。链接以及由它生成的任何短链接都已加密。
# en: 0d21e52aba49ee4331213463b46c2ece33ad3cf4
common-this-document-is-locked = 此文档已锁定
# en: 1dc606b1828a1e2f5bbbed9ed30fa3a80712e3d8
privacy-this-document-is-locked-with = 此文档已用密码锁定。
# en: 1526a17ee7570e6235eb76a6fef8ce4b6d9a3486
privacy-unlock = 解锁
# en: 887b0828ec99930408eb32249f1209057b1b234c
common-unlock-ellipsis = 解锁…
# en: ce3661a255464b1b22e6f395685d0e6f9fa077da
privacy-what-this-device-holds = 此设备上存储的内容
# en: 8485be9e7b3e998c5f1eef5ce87d2aa67726e3cb
privacy-your-documents = 你的文档
# en: d21905a9907932f7976e1ca96129c0af871f2715
privacy-your-browsers-history = 浏览器的历史记录
# en: cdff70e571d4ed7aeb1a43cedaf33299bdcd258e
privacy-every-document-opened-here-in = 你打开的每一份文档的全部内容，设有密码的除外。
# en: 18b8a03ed6567555edd5005aab5b090984f4b5bd
privacy-not-ours-to-clear = 我们无法清除这一项
# en: 3ca2d1d26637d42b974b313bb8ce231333179a9e
privacy-by-name = 作者：{ $name }
# en: a9e72cf83916d4381012a19b329292818f845a43
common-n-documents = { $n ->
       *[other] { $n } 份文档
    }
# en: 1a8f1553a9832c92927784f88f31a89cd991e803
privacy-n-links = { $n ->
       *[other] { $n } 个链接
    }
# en: 2ddd4097832d991c46023732a889beeb8ec4c29d
privacy-n-set = 已设置 { $n } 项
# en: a97ce1edde4ad396d1cff34063087d0bf5d0e1a8
privacy-copy-this-and-send-it = 复制这个密码，并与链接分开发送。它不会再次显示。
# en: 7640428ae16fc2b673d689ddf6b1ea15eed407d3
privacy-make-another = 再生成一个
# en: 9a0081f0b2bff82fac1961a403734134b9a3b170
privacy-password-copied = 密码已复制

## a document locked with a password, placed inside another (kit/share/locked.ts, kit/ui/locked-doc.ts)

# The card drawn where it sits; { $app } is the app's name: "A Spreadsheet document, locked with a password".
# en: db4307e70c2d2722c2af2f79643b28e73325e9be
common-with-password = 已用密码锁定
# en: fa27fac915c0c87aec9006392ae6422f59857f5d
locked-app-document-locked-with-password = 一份已用密码锁定的{ $app }文档
# en: 49db1d83c8636baba474ad11626b5a7c5260976f
locked-with-password-unlock = 已用密码锁定。解锁…
# en: 507e778ae244911abcb05b73967febd0edb425a5
locked-document-locked-with-password = 一份已用密码锁定的文档
# What one of them is called in running text, as an app's noun is.
# en: 78ed9fb58f4437d5d29cf78ba699a560017abe47
locked-document = 已锁定的文档
# A placed document whose link cannot be read (cut short when it was copied).
# en: 0c45986cb6755e463398a592a861baaf44018954
locked-this-document-cannot-be-read = 无法读取此文档。
# en: a2a127edeb3eed5dc264fc299b034db6493e1636
locked-that-password-does-not-open = 这个密码打不开此链接。如果你确定密码没错，链接可能在复制时被截断了。请再要一次，或要一个短链接。

## words several apps share

# A menu of what can be done to the document as a whole (the Presentation Builder's submenu).
# en: 6e16ec256749730ccec984c8efeb7804db5b9737
common-this-document = 此文档
# { $task } is the task's words.
# en: 15f18f71eefc9fedc6fedd434c2edc6a919bf130
common-done-task = 已完成：{ $task }
# en: 00c65041972e0368c2c8b452d60c0a0754fcc9bd
common-drag-to-move-tap-to = 拖动以移动，点按以选择
# en: 525df57dc3610e74377113b92951476bb9387e4d
common-move-left = 左移
# en: 3a43e56f34dece6eb3d79dee1eff7b2f87db6040
common-move-right = 右移
# The group heading the Calendar and the Trip Planner sit under on the home page.
# en: ae2f98a099fe5855c31126233e9c13641ee7fdba
common-plan = 计划
# en: 9985434cd07212b8dac01f8e015a1fa8adac9a99
common-chosen-tasks = 选中的任务
# A link that opens the document (kit/ui/compare.ts).
# en: cf9b77061f7b3126b49d50a6fa68f7ca8c26b7a3
common-open = 打开
# en: 7bb0ddf9221c03b806b03c209e8366000124aa15
common-task = 任务
# en: 090ec5f560fc50377fcd95e5cda128e91b276e98
common-tasks = 任务
# en: 1835508670fb85faefa88cd88d4f57d3cdb00716
common-find-app-doc-template-or = 查找应用、文档、模板或命令
# en: 0d47323c5ee8dde30a5ca28f6ed6103d42081b97
common-in-this-document = 在本文档中查找
# en: 733a5f2fb910bb704c7993cae3d8224558d405de
common-indent-or-bring-out-in = 增加或减少列表项的缩进；在表格中跳到下一个单元格
# en: bf6e36633c2362cb7fa31a0e8f833388a49ba28c
common-move-selected-items-up-or = 把所选条目上移或下移
# en: 989fe994e413c509c03d3dd229b775a3ddc4707b
common-nudge-shapes-in-hand = 微移选中的形状
# en: b11d72438f1b00b65769e9b8597829583dc4d631
common-select-all-words-of-box = 全选（先选这个字段，再选整个文档）
# en: be76d0b25853b431767ca5b5d57ef569bbc6ff2a
common-back-to-words = 返回文本
# en: 0c0b01d469faff60dc3b2d1c035ee0a7caa03852
common-extend-selection = 扩大选择
# en: 11a8a25332234992a14424d8aad6fb9ce3d3b287
common-next-or-one-before = 下一个或上一个
# en: b4365b2ed2016713788d08335e5157985010ac28
common-step-out-close-collapse-let = 关闭或取消选择
# en: fb2997642419cda8393061543f140d40a9323957
common-check-or-uncheck-task = 勾选或取消勾选任务
# en: 0a4adf12f01d48ecdb89f5eddf5f19fd89d94522
common-too-long-for-qr-code = 二维码装不下：请缩短文档，或分享短链接。
# en: 1e14a1c5e931f6ef8ce8378377366f3c68cef56c
common-n-of-count = { $n } / { $count }

## downloads

# en: 5b221e9c2a451799d8f37e2b9874409d5e03ab05
download-print = 打印
# en: f304fc6dd3e87a37a6c53cb62344c10a789a7ad9
common-print-or-save-as-pdf = 打印或保存为 PDF
# en: 473b3126e859286ef98d231328fa11a3216823a1
download-picture-png = 图片（PNG）
# en: 3ad1b6c4e3dcf07e9ac0c95d5303f7ca4f89e55e
common-web-page-html = 网页（HTML）
# en: 1ba61ab4dec3fa0358c9ed0c77d6ac46f598a1f2
download-text-tlo = 文本（TLO）
# en: 840a0fda84379bffc2a266a92bbb990672a7c8d2
download-data-json = 数据（JSON）
# en: f77017c03d9d2be93a74ef7ef7e099dd77976f01
download-downloaded-name = 已下载{ $name }
# en: 01125e1be1f56cdaa47c6314a158e1219af819b3
download-failed = 下载失败
# en: e7f6a6728b280414756d238ae70084720018ba47
common-open-in-tiny-little-office = 在小小办公室中打开
# Under a document cut off at a slide's foot: a link that opens it whole, in its own app.
# en: c510d6c04c0951500c8e43f623e9f8886c378aec
download-see-more = 查看更多

## the bar, shared by every app

# en: 95802daab3a23990338179f72248350c1434cf39
common-insert = 插入
# en: 19e07430eed6d97d6d73cb4a2967b1f316520f54
bar-bold = 加粗
# en: 1616e2e5405e69c4e3914c67c644a9bd3ac00956
bar-italic = 斜体
# en: 39773aa3efa19090c918baedac1fe737dea25b92
bar-underline = 下划线
# en: a93b9a6808a95ca93515164188159659017155cb
bar-strikethrough = 删除线
# en: e1da9275bc5b420601738531d5e4445b44e0e6e9
bar-highlight = 高亮
# en: a3089b7fae27bca3309070e0487079a25b8f1ede
bar-heading = 标题
# en: dd870cfcae5fa76d524491679a57b27d41ffb462
bar-bulleted-list = 项目符号列表
# en: 8294ea4f78d097513144a9b8ba4e6d545a2a19e1
bar-numbered-list = 编号列表
# en: 0424f6e7026fa4bc2c4a7043083417315113c79b
common-table = 表格
# en: 40e31a210a1913fd0a8b28b892780996d154c70d
bar-footnote = 脚注
# en: eb9a4bc1c0c153e4e4b042a79113b815b7e3021d
common-date = 日期
# en: 39fc72124884d6573e4f9f89585f071ed0782696
bar-undo = 撤销
# en: 471b94d402d16a5fe7549d001a68ada1f7ddb16f
bar-redo = 重做
# en: 24345a14377fd821d3932f4e82f6431640955b0b
common-today = 今天

## the editor (<to-text>): chips, cards and the bubbles

# A footnote's mark, and its words where the notes are drawn, by its number: spoken.
# en: f91f3abb5afff1229edcc701ea915aadef98aca8
common-footnote-n = 脚注 { $n }
# A card standing for another document held in this one, of a kind no app here reads: "abc document".
# en: ae6aebc074024e9de875113693a49f1e19bf555f
common-app-document = { $app }文档
# The same card when its app is known; { $noun } is the app's noun: "A spreadsheet".
# en: 3f77d60418ea2f6a04196c1e67715b3007390e77
common-noun = { $noun }
# en: adac69379a626c2436948a4ef1792c7d719ef929
editor-code = 代码
# en: 6512ee1541e9a6c52d5bf7cf465332e8df25ea3c
editor-connection = 连接
# en: 86ccb2898e6f07a6967cf007c54e365e26ba776c
editor-n-rows = { $n ->
       *[other] { $n } 行
    }
# en: 221e4b1822bb3e80534c57d63a89d0f58d85c77b
editor-notes-words = 备注文本
# en: e9b450d14bc2363d292c84f17cfad5cfbd58a458
common-done = 完成
# en: d70f93df5e8f9b55be44fbeee9d203972e3383d4
editor-address = 地址
# en: 74d3b25667541c75d79e0558305f4bda62229bd7
editor-not-address = 不是地址
# en: c8648f259049ce8bdb49529963c37a97f75e8d4b
editor-set-link = 设置链接
# en: d2de1a2831e7fee28d6c8d214b66da0d1bed30c8
editor-open-link = 打开链接
# en: f377ac75602950b2c36449de5bceb3c12333ac77
editor-change-link = 更改链接
# en: 8d48d1f9e74c4fecd89a67645ca3593ef0964710
editor-remove-link = 移除链接
# The selection bubble's name: what can be done to the words selected.
# en: 041a5dec481d6bf0724caeaa84bc135d7d9062d4
common-format = 格式
# en: e5fd9cfe0e8039111d54b588e77b2bb0cad41c3a
editor-done-lowercase = 已完成
# en: 4ed7199b77561b7a7c013f7a8504b6686496302d
editor-not-done = 未完成
# en: 984cfca8d70e0b1e37a9e70c98a219bb12a05f23
editor-bold-italic-and-links = 粗体、斜体和链接
# en: a983f10d71bb808f58795f6ae728a6e76f08ce78
editor-one-of-words-column-holds = 此列已有的词之一，或一个新词
# en: e31d972229de381b461860014dd710856361917a
editor-option = 选项
# en: eb883fb88ed57f39b760fee6ee8f5a04a8cdc7ba
editor-this-browser-lets-page-paste = 此浏览器只允许通过键盘或“粘贴”菜单粘贴。

## the example in the kit's own documentation

# en: a76d4605993fe042c6e171382b1fba057fa31ff7
example-n-slides = { $n ->
       *[other] { $n } 张幻灯片
    }

## the Word Processor

# en: e8e834c4d268a3032b26958914d01ef0addf080e
common-word-processor = 文字处理
# What one of its documents is called, in running text: "Untitled document"; each app's noun is in its section.
# en: 4f8278c89ad16da05fec4fdfc61fe44798b92720
write-document-lowercase = 文档
# The group heading the Word Processor sits under on the home page.
# en: d26d55c7f815c82cf430c3915b3bb833d3f02e5e
common-words = 文字
# en: 703864836e29b00a7c7490f714fd2d18474de840
write-words-on-page-headings-lists = 页面上的文字：标题、列表、链接和注释，会自动计算的表格，可按 Letter 或 A4 打印。
# en: e214b8a29923056887b7edf6635d90dcbb2abe88
write-document = 文档
# en: 6e660ac1c8b81a53e302f6bb0298551ec820eceb
write-here = 在这里写。
# en: 6b8ad00f4398c3aa47f82637d019dad9e4f9da0c
write-subheading = 副标题
# en: 05058e0b630498611ebc41894f7b1670dcd5870e
write-paragraph = 正文
# en: b4d812c8bee8056808c14f1b31b6765342c8437e
common-bring-out = 减少缩进
# en: aacf42132cce6cf5c1608a5d27f90fcbf93ae851
common-indent = 缩进
# en: c83b0ec2d98a2ca38077be2f03102aedeb0ab261
write-align = 对齐
# en: b442b455b6a5e55f249769068c3fcc4832aea89d
write-align-left = 左对齐
# en: a2391118c8141b7f016207cb0da015ce9b3323e4
write-center = 居中
# en: 9bb446b31da260be7a0206a0e15270eb6bf47255
write-align-right = 右对齐
# en: 536d2746f7f2f88df35515a9cd5e44cb1582b9ca
write-justify = 两端对齐
# en: 2ed7f99f153a2a3dd123644137db651eb191b2b2
write-paper-paper = 纸张：{ $paper }
# The Look menu: each look's name, then a line about it drawn in its own type.
# en: c1ccf83eea101ddafb5de4e3dea5f3693ae473c0
write-sans = 无衬线
# en: 2fa97b3a9a6621a3a887ef5686bf4604fa6804e6
write-clean-and-plain-throughout = 通篇简洁朴素
# en: 56632c1841ab67cf1e7c7179b9c5ea0e32ea81c1
write-bookish-serif-throughout = 通篇书卷气的衬线体
# en: 7daed9b46fb34186159d19a2dca5208daf510f54
write-monospace-ragged-right = 等宽字体，右侧不齐
# en: 9ec6ab25de9a050b550600a98c5a63e5b2c00bf8
write-serif-and-sans = 衬线与无衬线
# en: b3ca8ebc46d597ea38c5f4877cf7ae7bfb4e3d68
write-serif-headings-sans-text = 标题用衬线，正文用无衬线
# en: e0c6a397d49350373ed4d55573e9365c212631bc
write-sans-and-serif = 无衬线与衬线
# en: d9d9d24d3963e4acfa41725ddd5a228f70b0869f
write-sans-headings-serif-text = 标题用无衬线，正文用衬线
# en: f69f233005f15802770fd26fbf7ead52ec13d9e6
write-book = 图书
# en: d242210a93b0f91c16b76df2eaf8efc7ae211585
write-justified-indented-small-caps = 两端对齐，首行缩进，小型大写字母
# en: 5ebe6500747dd5dbad08cc1b33d55fac89ccbe97
write-newspaper = 报纸
# en: ed0ae2181b2137e6b9f63fdbaeed415ac7e73502
write-narrow-headline-two-columns = 窄幅大标题，分两栏
# en: 62fb6cfda0506f0ed73ad066151086d3eed2296d
write-horizontal-rule = 水平线
# Insert ▾'s rule in a document: what follows starts the next page.
# en: 830b8871f026d13b7b94d6723471f2b4e152e360
write-page-break = 分页符
# en: 9ce3bd4224c8c1780db56b4125ecf3f24bf748b7
common-ok = 确定
# en: f2dc2c1e1465864ffbc4e8100c86cfeeafc4fffe
write-this-card = 这张卡片
# en: 1e06557fc0660e50a99fa6eef90bff822411e3ae
write-open-in-app = 在{ $app }中打开
# en: 108add9c9b3eed03ee5eb57783d780a485840218
write-locked-worked-out-for-you = 已锁定：自动计算
# en: ec0c3b76630fd745381cc215a284820af75a683a
common-footnotes = 脚注
# en: 5c71d5f47999af43b0a80e72abd8e5b79e736f80
write-back-to-footnote-n-in = 返回正文中的脚注 { $n }
# en: 6bc94b9eb554810d980ae7fb5673badbbb0b531c
write-back-to-text = 返回正文
# en: be51f46400fec04e375ba1ea35d98d05b69a1a2e
write-n-words = { $n ->
       *[other] { $n } 字
    }
# en: 71d562b7d96e16456a25e7230f3bc08bb796552a
write-word-docx = Word（DOCX）
# same
# en: 23e67fceae0d77dd571dd25695fc0499faf1bb77
common-markdown = Markdown
# en: d50fcd6f846a2616a90ec5dd1f67488a993c2743
write-rich-text-rtf = 富文本（RTF）
# A table in the text: its heads, its handle, its column menu.
# en: f4344253d823d09db13bc3877d37c9618588506a
write-add-column-before = 在前面添加一列
# en: 9b3acfc74a5d37d699868ade0ed3d142024174cf
write-column-c-what-it-holds = 第 { $c } 列：类型、名称、添加或移除
# en: 1f01479a40aa348fc273d4d09636403f89eff717
write-table-move-copy-or-take = 表格：移动、复制或删除
# The templates
# en: cfd76febbb671e54b2f280128fb5c317389758a7
write-a-letter = 信函
# en: 7456f1ce5f81c497b66302751f617f60612306f6
write-your-address-date-greeting-point = 你的地址、日期、称呼、正文要点和落款。
# en: ae3cd6584a49de52c70c1e00ae0a02c8abab166b
write-meeting-notes = 会议记录
# en: 7bbe470d4a5d9510c0fcb6844b519d118681beb7
write-agenda-what-was-said-what = 议程、发言内容、决定的事项，以及谁负责什么。
# en: 9fb58963c66db0c8ca7c638f491e82246e226d30
write-resume = 简历
# en: 3f3c7baad1c18a4ab23412f60d65b5179346006d
write-name-and-contact-experience-education = 姓名与联系方式、经历、教育、技能：一页纸的简历。
# en: 5a0ba3bb83f0992ba00ae94db6a7464210c40711
write-contract = 合同
# en: 50899f480b3395ee509689b06672ad9d8719e082
write-plain-words-agreement-what-each = 用平实的话写成的协议：各方做什么，以及如何终止。
# en: f9f38818c406d0878defb17a2356e1a2c658861a
write-invoice = 发票
# en: 4e056cf73efd0995ce1e7c5fd88900894935896c
write-who-what-and-how-much = 谁、什么、多少钱，金额在表格里算好；印成纸质件寄出。
# en: 80c40a5c8be53118fd8a9fc487b43f20c3014fbc
write-cover-letter = 求职信
# en: fe727759e1b85df4a1d71348a1a6dfd6ef8e135d
write-applying-for-job-position-what = 应聘一份工作：职位、你做过什么、为什么选这家，分四小段写。
# en: 1fd79b9555ddf59862d60aa0aa3bb74fb74aae78
write-memo = 备忘录
# en: cfa5a189ad757d015661acb500917a198d8a13e1
write-to-from-date-and-subject = 收件人、发件人、日期和主题；一句话说明变动、原因，以及需要你回复的事。
# en: 092f99ea11a34a8490e7a767a83a42fc45634f82
write-minutes = 会议纪要
# en: 34dbbbeddd62f120a000701c56adebc8bae95352
write-formal-meeting-who-came-treasurers = 一场正式会议：谁出席、司库的账目、一项动议及其表决、行动事项。
# en: e04a25d1f69061bfe7770b16891fca2c413bcbe0
write-one-page-cv = 一页简历
# en: 11628c83c5de19d1338628ed7153b648f496b27c
write-typewriter-set-cv-now-before = 打字机风格的简历：现在、过去、教育、语言和工具。
# en: 6ed05e720ccc3ef269db1b38201da8b873acc895
write-newsletter = 通讯
# en: e583899cf44dbc07e6d8d4e7a252d39552e4e3d4
write-block-associations-month-dates-in = 一个街区协会的一个月：表格里的日期、欢迎、新闻和感谢。
# en: 1dcda804c96da3cc7e73e8a1672d4379a741f11a
write-recipe = 食谱
# en: 72490fa559ee9ce5ed498b58b3e2cad900af7155
write-what-you-need-in-table = 所需食材放在表格里，可从四人份调到六人份，再一步步写做法。
# en: aa3ddab4d749b73414ddd65201f9c6553b98a49b
write-questions-and-answers = 问答
# en: 1854b96dd11603bed03cce723369ef661a6f34f8
write-questions-people-ask-each-heading = 大家常问的问题，每个问题是一个标题，答案在下面。
# en: 6d234a17fecd5048e790eb4d1c415e17899a0e56
write-press-release = 新闻稿
# en: ba41d12bbba317bcacf230155abba7ce9e400379
write-news-in-first-line-detail = 第一句讲新闻，接着是细节、一段引语、时间安排，以及联系谁。
# en: 0c30f8a886ae8207e0702b4daf5eda405b19a131
write-news-article = 新闻报道
# en: 66280b179ec208e759c8fd7e05a4b1171c355c9f
write-headline-byline-story-in-two = 标题、署名，印在纸上分两栏的报道，以及一张数据图表。
# en: 19ad8ec7231e0cc9d9ea7e0684742672018e1f05
write-interview = 访谈
# en: a8d0cc9ab05d2f4925e897a47c9c9554e289fb4e
write-introduction-then-questions-and-answers = 先是引言，再是问答，每位发言人都标明姓名。
# en: 94a18e60341a34b6feec02442ec2d70ee1244900
write-book-review = 书评
# en: a8ccbb45148f664a9800e533e32902524ce8217a
write-book-stars-what-it-is = 这本书、星级评分、讲了什么、哪些好、哪些不好。
# en: 1eb36cb79b31a29c161965efdbb310289b4e5814
write-music-review = 乐评
# en: 75857043416829c78af6afbfcd886ea90847e06c
write-album-label-and-length-stars = 一张专辑：厂牌和时长、星级评分、曲目、最佳曲目。
# en: fae48a8f67fd81fb5d54b5a9c2d60929cd5da2f7
write-thesis = 论文
# en: 8dd8017f140560c80229f7d051a8fb2376183e9a
write-title-page-abstract-chapters-with = 扉页、摘要、带脚注和表格的各章，以及参考文献，排版像一本书。
# en: 42921f1b739a62eb82bc6f16ce47ff5ce5fd4da4
write-grant-proposal = 资助申请
# en: 381d823ac8ecdff832331120748c151a113b2464
write-ask-need-plan-budget-that = 要什么、为何需要、计划、算得拢的预算，以及如何知道它奏效了。
# en: 1b731d688386e2e229d1c2b671e96c2bfce768a4
write-syllabus = 课程大纲
# en: fc9a91d648763f9cd04a596f372b833e76f709f8
write-course-when-and-where-what = 一门课：时间和地点、内容、每周安排，以及加起来是 100% 的成绩构成。
# en: 3c847b9cd456626c998b9d2793f7701117ee4c80
write-formal-complaint = 正式投诉
# en: f98daa2b60c626279045f82029a9e58dfcd90f4b
write-what-happened-in-order-what = 按顺序写发生了什么、你想要什么，以及在采取进一步行动前的期限。
# en: f74c6bc075b1961f73f45729ce6281dc84fb3ccf
write-letter-to-politician = 致政界人士的信
# en: 2e754026e13e7ebe41d9513e31f94d8268341243
write-ask-your-representative-for-vote = 请你的议员在表决中投支持票：你是谁、这件事为何对本地重要，再提一个问题。
# en: de21096f37522d15740e7a4acd69efc811f9b5ce
write-love-letter = 情书
# en: a6977a11c96b06575fd8359e1bb9e3dea5a21fcf
write-ordinary-things-missed-letter-across = 平凡的小事，因思念而珍贵：隔着距离写下的信，用衬线体。
# en: 1af339528a1814a5f1dc409f2d108e0308035b87
write-wedding-speech = 婚礼致辞
# en: b040a94a7bd386ebaee15aa4c4535da004fadc4c
write-how-they-met-what-you = 他们怎么认识，此后你看到了什么，对两人各说一句，最后是祝酒词。
# en: c88c994e6c6c50db17576753df90aac55138155f
write-eulogy = 悼词
# en: cdc87e623e95678f786543dd272ba279df15e8ee
write-life-in-few-minutes-where = 用几分钟讲一个人的一生：从哪里开始，他们是怎样的人，你会想念什么。
# en: 6c63ce6d4727a3fb46c16a62ac8d536b0b61fd08
write-zine-essay = 小志随笔
# en: ecce024c73aadb2150552b3419d5aa1c3cb72c17
write-personal-essay-for-small-magazine = 为一本独立小志写的个人随笔，打字机风格。
# en: 563a631aba8690962836c99d15886672eb96ef62
write-petition = 请愿书
# en: 6d3ace089783eb6cf5e5fe47a7d74a3ee5c21f39
write-what-you-ask-why-and = 你要求什么、为什么，以及赞同者的姓名。
# en: a6a1d25b018c9318540556e3fe374fdf8b23aff8
write-terms-of-service = 服务条款
# en: 79b220d914e24eb7ac79428e72639e8547d8ab9a
write-small-businesss-terms-in-plain = 小生意的条款，用平实的话写：预订、价格、钥匙、意外情况、终止。
# en: fe3b114dccf2739f949d65ac4101037eb8f92543
write-open-as-outline = 以大纲形式打开
# same
# en: de69a629f9c30af3f481110f0f42a7c0c5efacfb
write-a4 = A4
# en: ee14050617b7b58e17aabccd61c241ccdafc6379
write-letter = 美式信纸
# en: c036e85b63c6818f6732a2898cf85f30f8074bfb
write-name-this-column = 给这一列命名

## Insert's dialog (kit/ui/insert-dialogs.ts): Tiny Little Office Doc

# en: d5674bb4dcb8c5fe378eb9cd0bb9d1849ed37581
insert-tiny-little-office-link = 小小办公室链接
# en: cdea71ff947c2b49dd7d7ea146fd3efeb9fa5677
insert-opening-short-link = 正在打开短链接…
# en: 9d2d34c4b04d8410e0025beb7899a31d1bc57c04
insert-paste-link-of-another-tiny = 粘贴另一份小小办公室文档的链接，长短均可：它的第一页会显示在这里。
# en: 7e4861cdc8de2c0c4cf87ca37c9130a92051b5b0
insert-this-is-not-tiny-little = 这不是小小办公室链接，或者已过期。
# en: 1eb05dc15f4e90a6a61c46b111812e974555cd81
insert-tiny-little-office-doc = 小小办公室文档
# en: 7bb236efe4e244196e506d65542626cfe368bb09
common-tiny-little-office-doc-ellipsis = 小小办公室文档…
# Insert ▾'s group of the apps a new document can be made in, inside this one.
# en: f9f93f3f14cfa3eea1bfcfee97ae22cd15b25e0d
common-new-document = 新建文档

## another document edited in place (kit/ui/doc-dialog.ts); a table's size is Rows × Columns

# en: 77dfd2135f4db726c47299bb55be26f7f4525a46
common-cancel = 取消
# en: 52d0b35277ee4b2b66ec4016620c658d99c7b57a
doc-rows = 行数

## charts (kit/draw/chart.ts)

# en: 7b6451ab3171ebc15cd43dfe0d80c1a0062c902e
chart-empty-chart = 空图表
# en: ad5fb3b6084bf40286ee5437a7f894e0088a499d
chart-bars = 柱状图
# en: eb911036281c4d6d5c0b067a7951e39b0aca7b63
chart-flows-sankey = 流向图（桑基图）
# en: ecbdb15a7119ffa05cdc38ee38e20c129e28a8bc
chart-flows-list = 流向：{ $list }。
# en: c6fd3870c86e7422a0146e1e2a052437fb8e51e2
common-lines = 折线图
# en: 5a2f5ac996eef952d239a22e8d68296faf975994
chart-nothing-to-chart-yet = 还没有可画的数据
# en: 7631740b7c7b5a09ad168ae28580b5c9ca4b8c06
chart-nothing-to-chart-yet-rows = 还没有可画的数据：每行写 来源 | 去向 | 数量
# en: 9318d4f63aeffddc47d4520c722ad70f0ec6c63a
chart-pie = 饼图
# en: 40c20d94e78fa142819df8cc9440d30e65329975
chart-series = 数据系列
# en: 79b2c4ce6295c191bf1031160055f59fb8174174
chart-kind-chart-data = 图表：{ $kind }。{ $data }

## the Spreadsheet

# en: 12acc4f41c4ad8ed5996ac33a2f066e024ba1c65
sheet-clear-these-cells = 清除单元格
# en: c527ea0aeba3f2d0104802279fed7e595157b78e
sheet-fit-this-column-to-its = 按文字调整列宽
# en: b92fe41ac34453cd0368f0fa5d00d1e9b0279c12
sheet-cells-in-hand = 选中的单元格
# en: 119faf17cd1de268ce34ade4f9bae4520774f640
sheet-check-ref = 勾选 { $ref }
# The column type that holds words as typed.
# en: c3328c39b0e29f78e9ff45db674248b1d245887d
common-text = 文本
# en: cc6fdf1b0963eceb567d2f5b641f4950751636eb
common-spreadsheet = 电子表格
# en: 469342764c059045df7b47882a77d96ceb261898
sheet-spreadsheet-lowercase = 电子表格
# en: 7e53821f70ae16079c4a6a64c52a91fae645bc5f
common-numbers = 数字
# en: 05634091c29d83162cee95ca003dc222a3bab8ea
sheet-spreadsheet-with-formulas-named-cells = 带公式、命名单元格和图表的电子表格；先给三列，需要时再加。
# en: 7aeba4cd15b1afc5015285c0854f0edae2380d36
sheet-budget = 预算
# en: d99860b75cc866415325dd845f03e65f1b9fc648
sheet-planned-against-actual-line-each = 计划与实际逐项对照，附差额和合计。
# en: 0a0a7c3be7656f55cd259d558c2d0eb59b893b88
sheet-expense-log = 支出记录
# en: c2effbb05c6382e67befb796de9be3ad264a1cbb
sheet-date-what-how-much-which = 日期、事项、金额、类别；底部有累计总额。
# en: a2d841e763d975477b0e1a51d15e6f25c9023d4a
sheet-training-log = 训练记录
# en: d5b29b7fbac7da4d79a420a8108f0c98bb1ab61a
sheet-what-you-did-and-how = 每次做了什么、做了多少；每类事项各有合计。
# en: 4d89a20e90ff128c4329c067414e272156b4b196
sheet-project-tracker = 项目跟踪
# en: a9f287fb1ede11b35e739a207cac5eddcfd2116d
sheet-tasks-with-owners-start-and = 任务及负责人、从今天起算的开始和截止日期、各需几天、进展如何，完成后打勾。
# en: 83c8cb0557f1a8ab76094b2801ae0b4cd23e4741
sheet-loans-compared = 贷款比较
# en: 8ae3fb1476eab673ec96c9e2614cad18cbd6f497
sheet-amount-rate-and-years-for = 每笔贷款的金额、利率和年限；月供（PMT）、总成本和利息。
# en: 53f4e4eb1a489c6a14658993062fc985a80bd775
sheet-subscription-business = 订阅制生意
# en: f14ffb32b12ec6d73e3971054ddf5248de50852a
sheet-visitors-who-sign-up-pay = 访客注册、付费、留存：用流向表示的模型，旁边是可调整的假设。
# en: 2f6636a8892aa5d7f9781b630c2131dc8652a7f1
sheet-cafe = 咖啡馆
# en: ce157b2ac144f603ec936234eb69d9d524c3354f
sheet-customers-day-what-they-spend = 每天的顾客数、人均消费，以及当月收入的去向：进货、房租、工资、利润。
# en: 27f8244e11467491805da5dcaace666e1176df07
sheet-freelancer = 自由职业者
# en: c7da5aec39e9bdd23c061f2f34a9ecb65f9f20a2
sheet-hours-rate-and-weeks-make = 工时、费率和周数得出全年发票；扣除开支和税后，剩下的就是到手收入。
# en: 53ca3d56131df7985cdd58b24a369278bce0d723
sheet-mutual-aid-fund = 互助基金
# en: 4df80f44a8c21f77f84393546555c9ab3224fe85
sheet-monthly-donors-and-one-off = 每月捐款和一次性捐赠充实基金；资助、少量管理费和储备金从中支出。
# en: 992dbb972d7850082f91f3f43d7b68391091a32e
sheet-month-by-month-with-chart = 按月统计，附图表
# en: 876c69fa93189c4e89f57aeec964d0573e61be81
sheet-this-year-against-last-line = 今年与去年对比，每月一行，画成折线。
# en: 467dda8775e7e01a3dacd9ff5d247da7caf931d3
sheet-household-budget-by-month = 家庭月度预算
# en: f61119c5b20c1ed2360f6aa2b583872a1fc9c474
sheet-six-months-of-homes-bills = 一个家六个月的账单和开销，每月一列，横竖合计并与收入对比。
# en: 2c2609efcdcac42f94b3d73758d40d3f2f79dfd8
sheet-savings-goal = 储蓄目标
# en: 49ff61e9d2d6e99106df2e02e7a626aa5186c112
sheet-what-went-in-each-month = 每月存入多少、目前存了多少、还差多少，目标放在旁边可修改。
# en: ca1ec97c50f7647ef3588d5de58af33939c01646
sheet-habit-tracker = 习惯打卡
# en: 7a2638dee7c38146953a64566dbd8fc8ea77d8d4
sheet-four-habits-checked-off-day = 四个习惯两周内逐日打卡；每天坚持了多少，每个习惯坚持了几天。
# en: d80f6ec7eac0c80248e2c7b452e21f89673449f2
sheet-reading-list = 阅读清单
# en: c809293d68f1061cf7062072d2efc8fe95fe9262
sheet-books-read-being-read-and = 读完的、在读的和接下来要读的书，各花了几天，以及今年读了多少页。
# en: 6e14850d9abea09c879f881a4773537f91cf2ac2
sheet-workout-log = 健身记录
# en: b2a1db48bce10aa5ac4b8eb894555098ecbaac30
sheet-sets-reps-and-weight-for = 每个动作的组数、次数和重量，算出训练量，以及每次的感受。
# en: 5be9810c81e208adc153f7aa0cc70f64c988d737
sheet-time-sheet = 工时表
# en: df9c77cdd1cdf96f00633ef7f822543a7185dbc6
sheet-weeks-hours-by-client-and = 一周的工时，按客户和任务分列；计费的按费率计价，并有合计。
# en: da7a3e11a9c1686127720177adfd2bbfed7224e0
sheet-trip-costs-split = 旅行费用分摊
# en: bcc455f94ab37c41dad441a4152ac7961c3118ad
sheet-who-paid-for-what-on = 四个人的旅行里谁为什么付了钱；每人应摊多少，各自欠多少（负数表示应退）。
# en: 3fcd3bd6c3c0517dc23b7c9c8a424a6ba7c30c9a
sheet-schedule-with-dates = 带日期的日程
# en: 9cfdf52e38ee970ebd6feac438c7d2cb6abd25c5
sheet-job-in-steps-each-starting = 一项工作分成几步，每一步在上一步结束时开始：谁做、几天、结束日期和工作日。
# en: 2a3b772f6e347425b5a235a2e956004ed5177213
sheet-grade-book = 成绩册
# en: 0e6fce40b16529c27d306da8834f33a391a5ca5b
sheet-classs-grades-for-essays-quizzes = 一个班的论文、测验和项目分数；每位学生的平均分和等级，以及全班平均分。
# en: 7d9ac107a69e997e571bd6906b535f6802bc5569
sheet-membership-roll = 会员名册
# en: 3bc0a32ca3d296ee9217f44adf3cf4d3c3dbd080
sheet-who-belongs-their-plot-and = 谁是会员、他们的地块和职务、何时缴费、何时续费、谁有钥匙，以及已收会费。
# en: b884fda377a19ce445f8ec49bd90f2784834978c
sheet-seating-count = 座位统计
# en: 4e00db4efd970061e8ff6cd63f723c7385ad1637
sheet-tables-for-wedding-seats-guests = 婚礼的各张桌子：座位、宾客、空位和所选菜品，并核对菜品数量是否对得上。
# en: 8a535a1def73648a0a55a9bfa21c9d370e434ce5
sheet-poll-results = 投票结果
# en: df60ac32ce5b04bf11e53f97d296db53c2a2cda2
sheet-answers-and-votes-for-each = 各个答案及其票数，上方画成饼图。
# en: bfee938677dd9bf5dab2de4f9558c07a06d616fd
sheet-fundraising-thermometer = 募捐温度计
# en: f6873b16e788104f3e409c1c06243db77d2a6e04
sheet-what-has-come-in-week = 每周收到的款项对照目标：上方是图表，到目前为止的总额用大字显示。
# en: 20ded69e290360ef0be6b1fd22e648ca398d7ed3
sheet-invoice-ledger = 发票台账
# en: 2404f6c1a633f188d6395d7b35f7dd1486c597b6
sheet-every-invoice-sent-when-to = 每张已开的发票：何时、给谁、多少钱、何时付款、还欠多少、逾期多久。
# en: 300d29fd5f327e8c7a0f4614d4125d93570eeeff
sheet-inventory = 库存
# en: cca3ceb6d79e8c2e922aa21c8675223c1b96c275
sheet-stock-on-hand-against-point = 现有库存对照补货线；该订多少、价值多少，库存低时有标记。
# en: ba8d2875e56e1ee2a745057f4de807182be4bb9b
sheet-petty-cash = 零用金
# en: 8c7a0a9d0703152466c522d2d8bbd55cfcea218d
sheet-money-in-and-out-of = 钱盒里的收支，谁花的、花在什么上，每笔之后的余额，以及收据打勾。
# en: dca1686c53daf52f46495f2a961a3346006e41ac
sheet-rate-card = 价目表
# en: 1a3c8694038b9c6d56a26e131d62c3616e165a77
sheet-freelancers-services-with-hours-each = 自由职业者的服务项目及各自所需工时；价格和加急价格由一个小时费率算出。
# en: b9d1a465f75615e0b55ff620ec057c608971b8ed
sheet-mortgages-compared = 房贷比较
# en: 43ecdf4a244c2e1c022c6c08a3ba1c07f107ece3
sheet-four-offers-on-one-house = 同一套房的四种方案：首付后的贷款额、月供、含税总月供，以及利息。
# en: 54695e5df6ef00663252186d998a600f9bac4c58
sheet-unit-converter = 单位换算
# en: d2e0c086c77046805d1cc8934044bb315bf00aec
sheet-miles-and-kilometers-pounds-and = 英里和公里、磅和千克、烤箱温度、杯和加仑：输入一个数量，读出另一个单位。
# en: 9d2911edf283fc08872808d554a1017460fbe86f
sheet-tournament-bracket = 淘汰赛对阵表
# en: ad907a82b59f9d64761c80d6b2fe13c2a3b04fc2
sheet-eight-teams-single-elimination-each = 八支球队的淘汰赛：每场比分、算出的胜者，以及晋级决赛的胜者。
# en: 0e2d6a433d926deb1903e03f166c76cd50bd542d
sheet-excel-xlsx = Excel（XLSX）
# same
# en: 3281188351b89c8e2db28d6da7af4992d415de90
common-csv = CSV
# en: 795a4ad3f904388d715a0384382b361f16342610
sheet-chart-svg = 图表（SVG）
# en: 3001366084e5b141572a5a7b708f24fc835d2720
sheet-chart-png = 图表（PNG）
# en: 492630372c601d63c25590ebdc75ab6f34a2ff74
sheet-empty-sheet = 空工作表
# en: 2decd02b722b692c9d30d7de5e0c1191d1968de7
sheet-n-of-max-shown = （显示 { $n } / { $max }）
# en: 9e85be5a97dd107512bd06368b695b4265a662c9
sheet-50-more-rows = 再显示 50 行
# en: 46dd847f36799647b69659ed71327486c70728ea
common-add-column = 添加一列
# en: dff758e7f1104295adde7af1bb92396f6c7c88a7
common-add-column-after = 在后面添加一列
# en: 66c7734789e19cbeef3a5ac185ea732139aed213
sheet-chart = 图表
# en: a0e276f06261f873cb144d086a0f3c33941f43f7
sheet-chart-of-table = 表格的图表
# en: 1d66c3d0758e71b315e012814dc35df62cfab9d2
sheet-checkbox = 复选框
# en: 3c5512cb6f54f5f5483d681781a71d95982c8769
sheet-column-after = 后面一列
# en: 6d36997d9f52785865f243c2436502c328d12b1f
common-column-c = 第 { $c } 列
# en: b4a57f5f40871854cb181f17a04c4e72c5c4048a
common-column-c-holds = 第 { $c } 列的类型
# en: b657e2a4e550834ea13d1026bf21694fb9a65c3c
sheet-column-c-type-what-it = 第 { $c } 列：{ $type }。类型、排序、添加或移除
# en: cf723c59b62a173547c39c3d661c4ee7c240bab1
common-columns = 列
# en: 40c14f884fe7e5b4e58ea4bd6f6d522bae43134b
common-delete-which = 删除{ $which }
# en: 51f5ba33dabbc2c8aa4e3e640e0b27cb55aea1be
common-drag-to-fill = 拖动填充
# en: 87b8f44339c3a345782b1fa838bfa3b0406567b3
sheet-abc-or-123-for-this = 列类型
# en: 69ff8ba19299f697ed3f5401bb7c03f0abbc4c67
sheet-drag-to-resize-double-click = 拖动调整宽度，双击自动适应
# en: 363a9922cf56c76397d7b72ae8425d30d0438b33
sheet-fill-down-from-top-row = 从首行向下填充
# en: 549a401f55bc461388a4f5f8554db5e0749d0a28
sheet-fill-right-from-first-column = 从第一列向右填充
# en: 51f5ba33dabbc2c8aa4e3e640e0b27cb55aea1be
common-fill-drag-to-carry-these = 拖动以填充
# en: 4425eb9442fea0435d290b7a34f1ad8a6980e789
sheet-fit-columns-to-page = 按页面宽度调整列宽
# en: 720f58fb1f9353ab3c904b888ccb774c40393e06
sheet-formula = 公式
# en: f1e410ad1472b42cb42cc98962428637290b6706
sheet-function = 函数
# en: 4c0ab96e8dd44e528589261be865f136fcbae564
sheet-high-to-low = 从高到低
# en: 22c03da74b04607929f25258870ac2571a1b46bf
common-insert-n-rows-above = 在上方插入{ $n ->
       *[other] { $n } 行
    }
# en: 5e3141f35e5d110b9f6303876cf866971f689046
common-insert-n-rows-below = 在下方插入{ $n ->
       *[other] { $n } 行
    }
# en: ae3b3fa65ff4f34adbaf5d76e694293bb2059fbf
sheet-letters-keyboard = 字母键盘
# en: 7177342b32d961e7d51feb4571231982a48a0772
sheet-lock-these-cells-so-reader = 锁定这些单元格，让读者无法更改
# en: 893190219ca26f4bad6f2395b91da6295cab23b6
sheet-locked-part-of-model = 已锁定：属于模型的公式
# en: b1b588e8ffba9c37d560f4b4d63c6344d009ce2e
sheet-low-to-high = 从低到高
# en: 1dc043bb8eb5646851ff808477bb5d3573739f1c
sheet-money = 金额
# en: 709a23220f2c3d64d1e1d6d18c4d5280f8d82fca
common-name = 名称
# en: 3f37ebdc04c6216818bd5bbf8724175546a880c8
common-name-of-column-c = 第 { $c } 列的名称
# en: c103a2458adcf85547000188a915ccb91f45ee9c
sheet-names-cell-to-its-right = 右侧单元格的名称
# A money column's currency (Money picked in a column's menu): the field's hint, and what it says of words it cannot read.
# en: d02550533b8780a7e646803c3b7b9cb7a78ba756
sheet-symbol-like-or-code-like = 符号如 ¥，或代码如 CNY。留空则用文档自己的。
# en: 1224b5538c873fc11d856120fedeb76e516529c6
sheet-symbol-of-up-to-three = 最多三个字符的符号，或三个字母的代码。
# en: 630470a61228c20119f270074f1e0b6a4c2d9151
sheet-no-chart = 没有图表
# en: b7baa1d40c4ea29afc9098732bffee2a861a6c44
sheet-number = 数值
# en: 80838be5576c4b333f764e352ef9e6c5292b2b78
sheet-open-link = 打开{ $link }
# en: 1d6f3ce763f138e0025747a9d3ae7f30efc75531
sheet-opens-when-clicked = 点击打开
# en: ac556cf5938d2104533c38103305f6cf60ba245d
sheet-percent = 百分比
# en: 4f9fa8ea1af8cde7cca877c50ca723eeadee35dc
common-remove-this-column = 移除此列
# en: 12ee6fe44798c4fe94090bef612f25e903d9cd15
sheet-resize-column-c = 调整第 { $c } 列的宽度
# en: fa84cb8f7793313625378f4a9caa43b1abbf650b
sheet-rich-text = 富文本
# en: 45c89f220501dfd15e267bf7d636dc7a76526971
sheet-row-above = 上面一行
# en: 9be9bf4f94705d404df5c715fda96ae93fda7494
sheet-row-below = 下面一行
# en: 95d5eb6f6a50994282979432eb3c4dc5836db2e2
common-row-n = 第 { $n } 行
# en: 7d69f57d4baecc18e3e40be8d939c9d2cbc2e2f1
common-row-n-lowercase = 第 { $n } 行
# en: 8fcfbe7f09950cb9105bd4280c43ee2524090dcf
common-row-n-insert-or-delete = 第 { $n } 行：插入或删除行
# en: 767a59f7f0079a019b266853b864269f92d10d82
common-rows-b = 第 { $a }–{ $b } 行
# en: b92fe41ac34453cd0368f0fa5d00d1e9b0279c12
sheet-selected-cells = 选中的单元格
# en: 26b30f90bad8aab892824738a0dc60bd11d082be
sheet-show-all-text = 显示全部文字
# en: 9580fcbce0c31ceaa47eb583e5f7ce637fdc8a0a
sheet-shown-as-typed = 纯文本
# en: a2a5bdeca9391be1e0cdff1c19895bae7fadc2c2
sheet-sort-rows-by-it = 排序依据
# en: ff87bd67a9f3709f0a4247baa8ba4de4a5bd5fd2
sheet-suggested = 推荐
# en: eda0b8f3c389658a7369166fd4c36099e380adff
sheet-is-as-wide-as-it = 工作表已达到最多 26 列。
# en: 0f54b98f336606a21f0bcbdc77afa4474b2b1966
sheet-is-full-its-last-rows = 无法添加行：最后几行不是空的。
# en: 7a74dff615ee3bcbc90d8c31886f01082413c776
sheet-three-at-least = 最少 3
# en: c97ecbf8fed8c8a3a0d51412e2e9bd4c8539ba26
sheet-unlock-these-cells = 解锁这些单元格
# en: 7e592be640ccac5b2bdf24df5b74d19326b5094a
sheet-what-it-holds-sort-columns = 类型、排序、列
# The Spreadsheet: any column removed, the Option column, rich cells, a chart put in from Insert.
# en: 63362bbc585e9e03cbf63abe945bcf99aa4d8cc5
sheet-keeps-one-column = 工作表至少需要一列
# en: 7208e66f41dd004e736a1840e2a99d288a4c2060
sheet-choices = 选项
# en: 38b6d89278519f90efb25eb841096bc63d9095e0
sheet-choices-for-ref = { $ref }的选项
# en: a871e2c9206cb4854cc06c30bc6de95cb82f9700
sheet-has-one = 工作表已经有图表了
# en: f0dfb92a1f16391ab3bd5478ce9d8c0f2d74bf95
sheet-edit-cell-caret-at-its = 编辑单元格，光标置于末尾
# en: 28d1a54d2e35ad87c0d19942f68d70ddbf67bcee
sheet-put-back-what-cell-held = 恢复单元格的值
# en: 2b69414b3787eaa8a38f2f1a9c4a48aff7dd78a5
sheet-put-dated-rows-on-calendar = 把带日期的行放到日历上

## downloads: hand-offs to another app (kit/file/exports.ts)

# en: f03b6f674b16abfbc970946d0781228b3407655e
export-open-in = 打开方式
# en: 7f7b61c3d0574fa0bae27972834652c8b6f222e6
export-pdf-file = PDF 文件
# en: 20ab05206208a4e9bea088d36c6640c781c6bf65
export-copy-link-that-downloads-ext = 复制可下载 .{ $ext } 的链接
# en: 389a8e30f70f547f507d418d67a8048c7eb2eda4
export-could-not-share-ext = 无法分享 .{ $ext }
# en: 5869a7d435c371c52a7c02fe623f625c5062ba1c
export-could-not-show-ext = 无法显示 .{ $ext }
# en: b31bab5111d8c6e8c5b51deffa133f4e7063ec37
export-download-ext = 下载 .{ $ext }
# en: 6d92cb44456263f51e52b62171b3602b54c5fec0
export-share-ext = 分享 .{ $ext }…
# en: f9b579ae7d7104f25e1800d18a5b3e89343618cb
export-view-ext = 查看 .{ $ext }

## the icon library (kit/ui/icons-picker.ts)

# en: 716f63b96e0c263222949a3b8a00cdb4f46d3183
common-icon = 图标
# en: 07b3e447db02b7cc20a78a57c316febae22ed72b
icons-favorites = 收藏
# en: a8b63bb6a000ce6560e6126bf0fade0a56fef128
icons-search-icons = 搜索图标
# en: 7fcd8d44c6f295423534073543e6050ddd8cf497
icons-suggested = 推荐
# en: edb8f6c14252759cd8673c61a24376d32e17b93a
common-icons = 图标
# en: 7d9b3876b6aa451cf6a99a0323e97ba79d6a4a27
icons-no-icons-match-q = 没有与“{ $q }”匹配的图标。
# en: 213898967018ae7e0c3b4bf96e59877f9d434ca7
icons-search-by-name-or-by = 按名称或含义搜索（“钱”“天气”“ai”），在 { $n } 个图标中查找。
# en: 95553ba8a4056a6f9817d2dbbf0be4c66d9eacd7
icons-no-icon = 无图标
# en: 1935c7dc9183bd8f7d4987f70ff5592b29d45397
common-icon-or-emoji = 图标或表情符号
# en: 1699cec34f8ca2d63e0b366fc1fe83d5de3a0c13
icons-search-icons-and-emoji = 搜索图标和表情符号
# en: da588993ff27cbb60e3c1cecefb192d389748ef0
icons-or-emoji = 图标或表情符号
# en: 5090a9e78c899272a10648b39e7689bc40072825
icons-emoji = 表情符号
# en: d30201283cf13108c4beeb8c7c1787e5cda37590
icons-no-icons-or-emoji-match = 没有与“{ $q }”匹配的图标或表情符号。
# Unicode's emoji groups, as the picker's Emoji set names them.
# en: d883a36d4ea749e2946b208450185bccfbca11c2
icons-smileys-emotion = 表情与情感
# en: 45f4db9fab3599be7af02e3a58af52988789725d
icons-people-body = 人物与身体
# en: fee7d0c1beea3c67c9a835315496da822a22e839
icons-animals-nature = 动物与自然
# en: a9704a2ad9afea5f9d4d1504458f91e253557264
icons-food-drink = 食物与饮料
# en: 4cea7e0a28a73fafbe052e8132f1c86cd07a68ed
icons-travel-places = 旅行与地点
# en: e58f7f889902c81b8879128fede278022f0e459c
icons-activities = 活动
# en: 72a83add2c5ede877c10d23f302d3e17accbadab
icons-objects = 物品
# en: 22ad664e9eb98b75a73333b2b2395fc4b52e6fc9
icons-symbols = 符号
# en: 5d728758adcdd5154d3be55552c1c061ef1489b2
icons-flags = 旗帜

## the Drawing Tool

# The group heading the Drawing Tool sits under on the home page: Design. 'Draw' is the Animator's mode for drawing.
# en: bfa50c7a3838fc883b8f4fd701b280e77a3952ea
draw-draw = 绘制
# en: 51c99e5a9ce98b2b6990b55b10a46d2fd23a18f1
common-drawing-tool = 绘图工具
# en: f4f99578c04e974810cdd12ceb7ae902de7291d3
draw-drawing = 绘图
# en: 59b035367211a9382930b2a4c13637dbc33c4f32
common-design = 设计
# en: 0077c4c9a2bcb4318b7a85a034bc75912afc3cb5
draw-boxes-arrows-icons-and-labels = 网格上的方框、箭头、图标和标签；或像素画，还可以变成背景图案。
# en: b807ee7758852c19e577610f2c56bf3ee0fb29bb
draw-request-flow = 请求流程
# en: 00cbc89498c2f280038a754777730896717e8071
draw-browser-asks-server-which-reads = 浏览器向服务器发出请求，服务器读取数据：用箭头连起来的方框。
# en: 0b2cbbcb4742328b0a7288f1b69223de737b2d15
draw-flowchart = 流程图
# en: f7a7e4b122a1c6db709d59b923a8e915ae67c9b3
draw-three-tiers = 三层架构
# en: 8d884dc3538d977a76ea897e377b897d4b3cdc0c
draw-phone-and-laptop-api-database = 手机和笔记本、API、数据库和缓存：用图标和连线画出的系统。
# en: d5786d3d397a91b189e23529401c4f8d35cd09b0
draw-floor-plan = 平面图
# en: fddd68346c75bb66ad003c667e573feb965f7ca4
draw-one-bedroom-apartment-from-above = 从上往下看的一居室：房间是带标注的矩形，门是缺口。
# en: 38a0d171dc9e21d8e32aacfbb8a170dad9977d9c
draw-pixel-heart = 像素爱心
# en: 7f51a7b112b9965b1cf5d78f9b43f76de5ad8f0d
draw-16-by-16-heart-in = 16×16 像素的爱心，可以上色或重新开始。
# en: c65ee0720b3ba1dac7268415c7c987faabecc4a8
draw-background-tile = 背景图案
# en: e78fb3ca7b230e0df30391c85eec105bf55656bd
draw-8-by-8-pattern-that = 8×8 的重复图案：可用作绘图或任何页面的背景。
# en: 99cb45a6f4e975a5a7be78811422b5933dd6598b
draw-card-for-ninetieth-tilted-on = 九十大寿的贺卡，斜放在彩纸屑背景上：大字、鲜花、大家的爱。
# en: 2020c98a00da0ecd8574350e226b7d4c448a451f
draw-phone-screen-sketched-in-boxes = 在动工之前用方框勾勒出的手机界面，并注明每个部分为何在那里。
# en: 106c289912d69f2f02f64b1c195daa945a29c19f
draw-rosette-with-ribbons-for-volunteer = 为年度志愿者准备的缎带徽章，可打印、剪下并别上。
# en: c9c7469b74c0a43646cb4a46279d9930b271ca19
draw-block-party-from-above-stage = 从上往下看的街头派对：舞台、摊位、急救点，以及走散时的集合处。
# en: 6d12c8adbefeaeacac0d48274df3a195ca9a1d17
draw-badge = 徽章
# en: 32787c0201e95e7dd6ca00aa5dd63210e278e3db
common-birthday-card = 生日贺卡
# en: be3883124104a86065f65c46fcf4edff20e0842f
draw-can-we-refund-it-stores = 能退款吗？商店的退货规则，以问题、答案和该怎么做来呈现。
# en: 619a6e052e5343b8fbad2bfbc5a35d0aa4ec763f
draw-event-map = 活动地图
# en: 6349ac251c1b86c4744c7e0361a5e72ea5e38402
draw-four-16-by-16-icons = 同一网格上的四个 16×16 图标：太阳、云、雨和风暴，可复制到天气预报或按钮里。
# en: 9c6396f6f0d3ea9cb4720d61fecd3ede243d72c8
draw-game-sprite = 游戏角色
# en: 8752fbad4e546cb5ffe343544f280f98fc20d43f
draw-logo-sketch = 标志草图
# en: 26dbc52edd1d138f4ab006d860b56dee54bf919f
draw-order-to-doorstep = 从下单到送到家门口
# en: 9bdb2a0b447519986c24ccc21eaf68976587c9fc
draw-pip-frog-32-by-32 = 青蛙 Pip，系红围巾的 32×32 小英雄，已描好边，可以做动画。
# en: d8cca3dd62ad1e4c37a8b10c054464bbcb13e3c9
draw-room-plan = 房间布置图
# en: fcba7b3fe14a456c5dd428b4e0b28552efa25751
draw-living-room-rearranged-sofa-rug = 重新布置的客厅：沙发、地毯、书柜和书桌按比例绘制，并画出门的开合范围。
# en: 8640aa92343372c68f5d72660821c342598d8b38
draw-three-ideas-for-coffee-roasters = 并排的三个咖啡烘焙坊标志方案，名称用大字，并注明定稿的截止日期。
# en: 68224d905ee1bc5c63082121b1e80cf6fe7d08c1
draw-weather-icons = 天气图标
# en: 0d07d8bcde49fe88082ab75f75e2fd49bbcef253
draw-what-happens-to-package-from = 包裹从买下那一刻起会怎样：用图标和连线表示的分步流程。
# en: a5be156d0e860e683861363db9d3c32c664ca943
draw-wireframe = 线框图
# en: 3e8785ece820edb3b53646af4cc1d4e3d40e13cb
common-picture-svg = 图片（SVG）
# en: 833ba107dc3d58db8b9f35a717d7bd43c83a0817
draw-background-tile-svg = 背景图案（SVG）
# en: 34f2e94dc9cb747e7afc204c645943fa3ab68196
draw-background-tile-png = 背景图案（PNG）
# en: 75f5b48c5980dd2997738dd7416aa5fe8ca60e9a
draw-animate-this-drawing = 让这幅绘图动起来
# en: a42ec2578a2a55cc28dcfbd53e3c34dee5d31d78
draw-drawing-of-things = 一幅绘图：{ $things }。
# en: 2759692cb0d64c0c370b6516074bb1de744a31a2
draw-drawing-of-n-unlabeled-shapes = 一幅绘图，含 { $n ->
       *[other] { $n } 个未标注的形状
    }。
# en: f33cdbb01b5b65fe3fe8928669d13ca09b3b5403
draw-leads-to-b = { $a }指向{ $b }
# en: b9e37b62382792094f5463a54183d523118a25a0
draw-joins-b = { $a }与{ $b }相连
# en: e0883468badf6a5f9c1cfe0ce209a16939a64683
draw-empty-drawing = 空白绘图
# en: 1f9c4a5ed21a39ed45db86eb13cbff389eede2cf
draw-pixel-art-n-by-n-filled-squares-filled = 像素画，{ $n }×{ $n }：{ $filled ->
       *[other] 已填 { $filled } 格
    }。
# en: 2aafc8e9796ba5ac5ccffa1800cf6c5ba65250fb
draw-pixel-art-n-by-n = 像素画，{ $n }×{ $n }
# en: 8598222918d3c6e513d63060cf55e2971ded729a
draw-select = 选择
# en: c158695a64adb40952c1cf9fde78b62bd6147f42
draw-rectangle = 矩形
# en: 8580e3175f4eb7461a5fac359ee86cd4c559d555
draw-ellipse = 椭圆
# en: b3850e04b5cc10929206d2336efa79a041358d57
draw-diamond = 菱形
# en: ea9676003762818513c636984faeaa0ae356839a
draw-line = 线条
# en: 3a4758c3cc8dac2d76026d0733816741f9b21d43
draw-arrow = 箭头
# en: 24421a551f456e8f5bde7180378b590f0337c041
draw-join-two-shapes = 连接两个形状
# en: cf6c07e7054fad4d6a8affaf62f285e16525c46e
draw-pen = 钢笔
# en: c72e323a57434ede3b6eb0cc235109eb76833c55
draw-any-shape-tap-for-each = 多边形：点按每个角
# en: 016a5405a0b425e7d1ac65317df59b45ce5fb1f5
draw-freehand = 手绘
# en: 8a48ec1f6c073fad0326a0e9251a18e4c88660b5
draw-drag-to-draw-line-or = 拖动画线或形状
# en: dcd096d38fc0be24bd96ac76246e98341b853208
draw-rounded-box = 圆角框
# en: 08596d60c57fd87e530cbdd2a06052b06d8c4137
draw-hexagon = 六边形
# en: b116d77a368034d3de6ca1dc0414de7dfd49400b
draw-parallelogram = 平行四边形
# en: 817b354dc01a34895eab0c37e21af38dc0850d08
draw-cylinder = 圆柱体
# en: 2c924e3088204ee77ba681f72be3444357932fca
common-note = 便签
# en: b406fb57b29fc76f71864fbb37f0238045f84d9d
common-black = 黑色
# en: cc9db3a795571c7e71f45670a1da7ff49b5f1557
common-red = 红色
# en: 09fb6aaba7940a7b7ffdbc9cbb9b3498303c1bad
common-orange = 橙色
# en: 933bf21afdd55a0d2283845fed0e7bbdd1f5db49
common-green = 绿色
# en: 7d44bc449c2a26374800a503f10f3d8949505f40
common-blue = 蓝色
# en: 32576f4fedc07f63020353af6a8aac66c4452c4c
common-purple = 紫色
# en: 3b4e294693563cc45de95b9db8b4abeabfac77db
common-indigo = 靛蓝
# en: 3526f607bcd4f51ad0bc05f814579a42c2c0ba57
common-yellow = 黄色
# en: b3d97fd6dece388a968e367f3ac4b9e64d739f52
draw-sky = 天蓝
# en: 54076359fdc7f1f0e000b9ae15b96f8b09866acb
draw-pink = 粉色
# en: 168cbb2ea52b9e34d271accecfa7d7951e948a99
draw-clear = 透明
# en: b1985e387405e4d4afb40d5dac9b2656f5d6f770
draw-shapes = 形状
# en: 4bab2d8fe13fa6ab57f80098b414f0f734c5dd25
draw-more = 更多
# en: 34f9968677e8b728f4405bf338fba32c66bd2a77
draw-icon = 图标…
# en: 64dd60fe1a049fe6db3eb1369dec2e42bf428e21
draw-background = 背景
# en: e1946387893c804aeadc93e5df5af3416cf1dc53
draw-remove-background-tile = 移除背景
# en: 1d0c8304baedcf8e3a78982c2e7c0b04622bf2a0
draw-color = 颜色
# en: cfdd099c4751f2f9aef2491f411111906956e0f2
draw-arrange = 排列
# en: 8c4e184c7224521ecdb958ef6eb40a05b5171f9a
draw-no-fill = 无填充
# en: 7adb6736cf2c9ae017b128f98738ffbae0e58655
draw-fill = 填充
# en: 1f65ed95fba62cd5b74b58c2ca9ba63448117160
draw-bring-to-front = 置于顶层
# en: e259d4e19e695a41e2f10680f2e3f5693711382a
draw-send-to-back = 置于底层
# en: 972d57379db3e5be76d4ead709fef1ad71ff03d6
common-duplicate = 创建副本
# en: 5301648dcf6b53cefc9ed52999aaa92d4603cae0
common-edit = 编辑
# en: f6fdbe48dc54dd86f63097a03bd24094dedd713a
common-delete = 删除
# en: d7bc7e98ec7a8acfd61dabe29e1e9156adf86fb9
draw-put-icon-on-this-shape = 为此形状添加图标
# en: 33bde816f0f7a53b8de67b8f8d6981f47e28159b
draw-place-icon = 放置图标
# en: 4fc05f2763ba31e2d3be5f08e7d0bab5d5dcbf78
common-zoom-in = 放大
# en: a4ae4b24a1f5369c2bff61abdbc221170e4b27d8
common-zoom-out = 缩小
# same
# en: e30eff925100b7c3e119ed678e39009e962455b0
draw-alt = Alt
# en: f978200b112084eef0c088e1d0075ad2fbca39cf
draw-alt-text = 替代文字
# en: 5cb1c64554b7e1dc72e12360f2d04f33dc206b1d
draw-alt-text-alt = 替代文字：{ $alt }
# en: d039700b1af48db561cd71c056aed2737e8fae32
draw-add-alt-text-describe-this = 添加替代文字：为看不到的人描述这幅绘图
# en: 676f1e162fc4f58007821f7c1a55b893e9a04715
draw-what-does-this-drawing-show = 这幅绘图展示了什么？
# en: c8636572fb4b9e79bae4c9fef82fc8109961c471
draw-diagram-of = 一张示意图，展示…
# en: 5a33f2e7e84274a5291191ca3105e62d897eee0e
draw-read-aloud-to-people-who = 会读给看不到的人听，并且不论绘图被嵌入还是下载，都随它一起保存。
# en: 988c63b77eade4f718f9d469cb36e35bff976839
draw-describe-from-shapes = 根据形状生成
# en: ac302ae45938c985822f097507602d624128f1d0
draw-tap-or-drag-to-paint = 点按或拖动来涂色；方向键移动，Enter 涂色。
# en: ea263dc45b04f2755ac61a51deecc96ade3fb6a9
draw-tap-each-corner-tap-first = 依次点按每个角点；再点第一个点或按 Enter，即可闭合。
# en: ccdc55c46a79ea604962ddda9cc010311bdca4fe
draw-drag-to-draw-end-where = 拖动来画；在起点处结束即可闭合成形状。
# en: ef5a6074bd843b506d359711212e8236802d80c4
draw-press-on-one-shape-and-let-go-on-another = 在一个形状上按下，在另一个形状上松开。
# en: 1005cc8c1dafc1f9eb422bf2ac68290b492fdfd1
draw-now-other-shape-tap-it = 现在选另一个形状：点按它，或用方向键选中后按 Enter。
# en: e3686f1c55ec91e31825e1d9510abf592d80b08a
draw-drag-to-move-them-together = 拖动可一起移动。Shift+点按可加选或取消一个形状。
# en: eb36764c60ec7a17dd6ac3ec7dbbd22ee401778e
draw-press-on-one-shape-and = 在一个形状上按下，在另一个形状上松开
# en: 199f4e86afea4f2d42eb40b63ce8599168575e06
draw-tap-where-icon-goes = 点按图标要放的位置。
# en: 86da5e24511bad8c1cace935e830c0625b04b607
draw-drag-on-canvas-to-draw = 在画布上拖动来绘制，或点按放置一个。
# en: a5742851f0f81d3bdcf184cb2a164390f3e989bb
draw-eraser = 橡皮擦
# en: 5136ae1b5bfe9175a6ed64915e648bdc240443a7
draw-pencil = 铅笔
# en: d60e52fb8066ebf1bf1329750c068e7042c783fd
draw-clear-grid = 清空网格
# en: 45ecea7c16e725c14cfec68f5b12d1545f222a73
draw-use-as-background = 用作背景
# en: 507f52dfd67fb731677bb9ae6971f9b5e891bc84
draw-grid-is-now-background-download = 网格现在是背景了。可以把它作为图案下载，或在任何页面用 tile: 使用。
# en: 209a1a74ee8eec09b861bc34e5ddb08a1357a364
draw-pixel-grid-n-by-n = 像素网格，{ $n }×{ $n }。方向键移动；Enter 用当前颜色上色。
# en: a9deda2292f9b3c9a827e2aa71e0da6b4db9f16e
draw-row-y-column-x-ink = 第 { $y } 行，第 { $x } 列：{ $ink }
# en: d316afce8845f59e541c981d07d81bab22858d00
draw-as-repeating-background = 作为重复背景
# The contextual bar under a shape, and its words typed on it.
# en: 27bb3dadbebca64cec249a9811a07cd3ea25a520
draw-dashed-line = 虚线
# en: 8953b1fb5c8eeda2158dfd09bde1a766d4b9079d
draw-dotted-line = 点线
# en: 6597b9e38708468a6ada223bbd324b34dd9b8d23
common-edit-words = 编辑文本
# en: 73a03229ad334f953ab9119481b53f881218d015
draw-extra-large-text = 特大字
# en: a489f3e9ff96e710da6f0dad589e2e4f58ba2dde
draw-gray-fill = 灰色填充
# same
# en: d160e0986aca4714714a16f29ec605af90be704d
draw-l = L
# en: d7f442ef62cb3d9ac929d5c992b5daf0ca7721d3
draw-large-text = 大字
# same
# en: c63ae6dd4fc9f9dda66970e827d13f7c73fe841c
draw-m = M
# en: 3142905be6683e711043cf1317f0beb5a495ee4b
draw-medium-text = 中字
# same
# en: 02aa629c8b16cd17a44f3a0efec2feed43937642
draw-s = S
# en: 11cc69c6f994eeb6dd90a55a7ce3bbc682544f87
draw-small-text = 小字
# en: 6e9a379022a3fda2be5039485a0a092130c73f70
draw-solid-fill = 实心填充
# en: dcfb9c041348e0d62c058f37225ad2185472edc8
draw-solid-line = 实线
# en: b233a397b799e80f21b88a34ae7e30af0528d1c1
draw-shape-in-hand = 选中的形状
# en: 6be4ddf808de37e8c50aae4f621dd09b03f5a4e6
draw-words-of-shape = 形状文本
# en: 1737205dd1aad709dc2209b2e892ffb8c4de0fc8
draw-type-words-enter-is-done = 输入文本。Enter 完成，Shift+Enter 换行，Escape 取消。
# same
# en: a2f9d0d16d02a20ef369e6029d9e5929c3d70d3e
draw-xl = XL

# en: aba6eb7da15924b741fdff98ff19be9915cd84f1
draw-drag-to-move-corner-handle = 拖动移动。角上的手柄调整大小，圆形手柄旋转。按 Enter 或双击可编辑文本。
# en: 9cacab39109399036915a6b67336853e622472cd
draw-drawing-canvas-v-selects-r = 绘图画布。V 选择；R、E、D、L、A、T 绘制；方向键微移；[ 和 ] 旋转；Enter 编辑文本；Delete 移除。
# en: 4421c5912fa5d727f23883b0a69028e195e3717b
draw-tap-shape-to-select-it = 点按形状即可选择，或拖动框住多个形状。要绘图，请选一个工具。
# en: 6f72f3cd1255e9bb344a1f9adb5fc64770f07cd5
draw-rotate-left = 向左旋转
# en: b75f23d1d0e44603289911e22ad5efd66157913a
draw-rotate-right = 向右旋转
# en: 4e41a56fa9e8996a27760c0b9c78c126b0892d19
draw-pixels-n-n = 像素 { $n }×{ $n }
# en: 6469ebd3a4fdb9e64f402eed612d2bfc0e0bf746
draw-align-center = 对齐：居中
# en: b25d3dd496584e2c6258aa9c77cc555dfd5988a4
draw-align-left = 对齐：左
# en: e65f83bdf0bfbca6e0efd3f75baa155ab6652113
draw-align-right = 对齐：右

## the Animator

# en: a6b8b600c27ce95ddcf867cfc503564c89fe816a
anim-animation = 动画
# The templates: what each motion is, in a line.
# en: ec026663a7e4c23dd850c7f5a96deef71bf8bb81
anim-lift-off = 升空
# en: 5d15aaf0784e98385ffc925f574edbf1a0657292
anim-rocket-climbs-away-with-its = 一枚火箭带着影子飞走，文字随之上升：两个形状，各两个关键帧。
# en: 1cc22feeb4a82e33a9fd435fbf7c4a927a0408e1
anim-bouncing-ball = 弹跳的球
# en: 567b2c86aa06b4d0133474a39dc6545196754a25
anim-ball-falls-faster-and-faster = 球越落越快，砸向地面，影子在它下面变大；来回播放，就会永远弹下去。
# en: 7296aa4a483797a1a82ec05a4598688ca056cd36
anim-loading-spinner = 加载转圈
# en: ccf7f6eb9188fe228da413a1aaf39c5ee4994346
anim-eight-dots-in-ring-each = 一圈八个点，依次放大，于是页面保存时有一个亮点绕着转。
# en: 691f884e182237907640c6964bda657a5ffec1c0
anim-title-card = 片头字幕
# en: 56d07df6f27b468d9e3456707110962e1da029c6
anim-red-curtains-part-on-opening = 开幕夜红色幕布拉开，电影节的名字浮现：只播一次，停在片头上。
# en: 1383ce3b8f642f2c5946975ca61e868e4a504819
anim-present-hops-stars-and-hearts = 一份礼物蹦跳，星星和爱心绕着它摇摆，祝福语闪着彩虹般的字。
# en: fad7f01d931894b10da998319cdc82f1a7d7e4dc
anim-quick-standup = 快速站会
# en: 79d688c0e9e1f3c402c3d6bedae252cfdd0b27aa
anim-meme-with-caption-above-and = 一张表情包，上下各有一行说明，中间有个又转又晃的时钟。
# en: 7e9b34abf6e91127f94374508015ad795c91268b
anim-build-is-green = 构建通过
# en: 2015347d0927e36755702bf7ae8677fa8d565545
anim-meme-in-two-lines-of = 一张两行大字的表情包，一座奖杯旋转着飞入、落下并发光。
# en: 98eb193445404588fd801a26b8383def925748ab
anim-flash-card = 单词卡
# en: 864aea3fc448ba5b87612d5e8c4c6dafde49b09a
anim-card-shows-spanish-word-turns = 卡片显示一个西班牙语单词，翻过来给出英语，再翻回去：绕竖轴转动。
# en: 23015d1cbacca964e41f5cbb0021ed050964a9ed
anim-weather-this-week = 本周天气
# en: 8dc082991f9eea4f537ecd34d66858c28b08bcb6
anim-four-days-of-weather-in = 里斯本四天的天气，每个图标都在动：太阳转动，云朵飘移，闪电抖动。
# en: b8224dd56d927c2c68b1498f39b7a2ed20f88c57
anim-new-year-countdown = 新年倒计时
# en: 6b46f602f1762ee9ef676cfb3d455fba6a9a07df
anim-three-two-one-second-each = 三、二、一，每秒一个，然后新年以彩虹般的字到来：只播一次，停在祝福语上。
# en: e004a532912502de514d6c1801dcc60517d6007a
anim-flight-path = 航线
# en: 69049056a83981f31dea9f7350b7356570e735b3
anim-plane-crosses-dotted-route-from = 一架飞机沿虚线航线从纽约飞往里斯本，边飞边爬升，上方是航班时间。
# en: 7de4868fea7340b1b7e0779ba2e81218c703ab57
anim-neon-sign = 霓虹招牌
# en: c0cba8072586f9c04d65da0f16b714c865f261e1
anim-cafes-sign-at-night-name = 夜里咖啡馆的招牌：名字闪烁，下方凸显营业时间，咖啡杯发光并膨胀。
# en: fadf71c7ea92e6416fd6d89969f8e78a115cd3c1
anim-sunrise = 日出
# en: 672c99d7a4f36fb3de226944eb862e3c9faa5663
anim-sun-comes-up-from-behind = 太阳从山后升起，清晨滑入画面：有景深、大小变化，还有钢笔画出的天际线。
# A key is a moment a shape is set at; between keys it travels. The effects (Impact … Blur) are meme looks.
# en: dc6828c6d02be5a4b4480bdf9e7f606c74b5ffd1
anim-animated-gif = 动画 GIF
# en: c81fe6cce809d8d3f0bacf4a00e1c62251061d39
anim-video-webm = 视频（WebM）
# en: e643c3f72a4f8b13abefb3c30793c8dbb2e124d4
anim-animated-svg = 动画 SVG
# en: 3b906156eac7b4b957d3a83ab79a3846fa2c900f
anim-empty-stage = 空舞台
# same
# en: 64fe85d796d8c2eda594dbc0b7b3452a4a2c444b
anim-3d = 3D
# en: fe12532bd63a2e75713ec69be11e92d48e9db3c8
anim-add-key-here = 添加关键帧
# en: 900aa998d3550d438fc20a414d3938fc3a1630ab
anim-blur = 模糊
# en: df0e298e356261439795d0d435ce0ce576604c65
anim-depth = 景深
# en: 8f25a859269ca51039632dd6bba28fb061cfb8d4
anim-effects = 效果
# en: b10a3addcfc5d7372c3a6101402e1f910da21188
anim-frame-n-s-s = 第 { $n } 帧，{ $s } 秒
# same
# en: 62036a7016ec20273ff717698fbad321c4ff002b
anim-impact = Impact
# en: 4c0a5de85ac9512b6a503ba785c3f369b5cfbda2
anim-key-at-s-s = { $s } 秒处的关键帧
# en: 74adc5789ce92de7bbb5e3d84a287a1ce6d3e7f5
anim-mirror = 镜像
# en: a7b93d2128e820f861fc8dfccd9f5521e89ad21f
anim-mode = 模式
# en: 987e5e1f455e03766d3ef3740947f4db46336d53
anim-moments = 关键帧
# en: 76cdb950721642b6b8596d36d5a39f7705028b99
anim-move = 移动
# en: 00706b5e9ede7f2fb6145370efd20ef72969df11
anim-neon = 霓虹
# en: 781961bc81c25697841ecce5d4d9dad9f6b261c6
anim-pause = 暂停
# en: 5d12bd53552cafc41ca6146c04870df2e1574e13
anim-play = 播放
# en: fa968bd1155bd76231814d479bf070ed96cca9bb
anim-pixel-art-is-made-in = 像素画在绘图工具里制作；动画制作让形状动起来。
# en: b4a9395d25398654fd5d000e4b82a1d8273339bd
anim-rainbow = 彩虹
# en: 3d5096b70833fdae355f1ffcf32faf2066123467
anim-remove-this-key = 移除关键帧
# en: aa0e7e86b7aa21e9851b9db8b752998918d2b608
anim-shadow = 阴影
# en: b7152342a267362add3c0d7f69f720f7a9c76c9e
common-size = 大小
# en: 4a6c11ab8104f8bcbb26155a8f68688d181f8a4b
anim-spin = 旋转
# en: 598549d7818087a7d04d49a7b9c00979c8a35c96
anim-stage-alt-arrow-keys-move = 舞台：{ $alt }。方向键移动选中的形状（或时间）。逗号和句号逐帧步进。空格播放。K 添加关键帧。
# en: a4277f79218220e03e7d4ebb5b1417cbdff137dc
anim-shapes-in-hand = 选中的形状
# en: 6c82e6dd86807ee3db07e3c82bec1ae1ce00b08b
anim-time = 时间
# en: 4ad8d1291a5b6b81cd03b1408570e1aae781c074
anim-wobble = 摇晃
# en: ac906b0770d1cc5e8330907f0063ba444eb3cf5b
anim-now-s-of-all-s = { $now } 秒 / 共 { $all } 秒
# en: c7f73bb54d928922c3838bb789ee9fb8a5b1eb37
anim-settings = 设置
# en: 89798935dfbced66a46a24ee534e23bbf5281faf
anim-this-frame = 当前帧
# en: cac09d8898c2435fb48b3b387ff152da7929eab8
anim-duplicate-this-frame = 复制这一帧
# en: 885c46b03eaf682f7c9534f7791ddfc3da84cd6f
anim-frame-earlier = 前移一帧
# en: 2c3d7664e236cb8254795d8ffd3761741ccfff7d
anim-frame-later = 后移一帧
# en: bb4f3c806dbc9e6d5247da5b492939d83c90cf2b
anim-delete-this-frame = 删除这一帧
# en: 406ce96669c44a0f4b79e02af1464b6aa7fbf232
anim-draw-shapes-move-sets-them = 先画形状，再用“移动”让它们动起来。
# en: b4d477d39704ecbf21ca422aeebffbad5a519fbb
anim-nothing-here-yet-draw-something = 这里还没有内容：先画点什么。
# en: 00f1eed948284854e29d59b2de928756b7f69388
anim-tap-shape-then-drag-it = 点按一个形状，再把它拖到它该去的位置。
# en: e4cabeb67c10b273fc4a1cfba538ac893c850f68
anim-drag-it-to-where-it = 把它拖到 { $s } 秒时该在的位置。

# en: b0d1915925616cc03de525611bfe58839cf5fdff
anim-anything-from-drawing-tool-moving = 绘图工具里的任何东西都能动起来：位置、景深、大小、旋转和翻转随时间变化，还有表情包效果。
# en: 739720909d046c563acd15a980c916ae9b0a75f7
anim-back-and-forth = 来回播放
# en: 7753216f948c789b0cbd5cfb16d1f50c1717383b
anim-forward-then-back = 先正放，再倒放
# en: e3e7a3833d19706ebf33b2c3baf8e05deeed7bca
anim-frames = 帧
# en: 0d0b09dfb5d45add0e2f90ec8b193d96ace76d0c
anim-frames-second = 每秒帧数
# en: 3570d228949889218e4c7fdb4ad8c942753530a1
anim-how-large-shape-is-drawn = 形状画得多大：1× 即原样。
# en: c028f533678015b6ac2e606a9cafef7e050b11aa
anim-length-speed-and-repeat = 时长、速度和重复
# en: 72f516ede84adba7283e1f7f5fd8eb787c7d33b0
anim-loop-forever = 循环播放
# en: 41b5b25a66d56fd91f645cbe6f83603567c3c480
anim-play-once = 只播一次
# en: 368e8081b781aac177fd07c2415b694b1f878911
anim-turn = 翻转
# en: b2343125992a36aa775f5740930f717a0d1a76d6
anim-turns-shape-about-its-upright = 让形状绕竖轴转动，像一张卡片：转到 90° 时只剩侧边，再往后就是镜像。
# en: dbe0717b0567202674ba26238e862ff18b3ffbbc
anim-turns-shape-around-in-plane = 让形状在舞台平面内旋转，像车轮。
# en: df7db1873937e8acd60c26ebf93191ad27b738e6
anim-which-shape-is-in-front = 哪个形状在前面：近的盖住远的，远的稍暗一点。景深不会改变大小。
# en: 2931befb0fbc6bdabcff5b420bf41435e4315548
anim-n-times = { $n } 次
# en: 4a84fdfdafe66c2c85e3e7d7c434de987984470f
anim-s-s = { $s } 秒
# en: b78baea4121d1dfde75020adb28737da7ea84e59
anim-frame-back-frame-on = 上一帧或下一帧
# en: ad3441e7c85b25bc4c7f46fd051345a6ba241e58
anim-nudge-shapes-in-hand-with = 微移选中的形状，或逐帧步进
# en: fe13ca0956192777b5060b354cf8e5dc5553c328
anim-play-or-pause = 播放或暂停
# en: d3b310dc90b3cc480984236a80101888836acfe9
anim-first-frame-last = 第一帧或最后一帧

## the Outliner

# The bullet is the line to the parent; a join between any two items is a connection. { $from } and { $to } are items' words.
# en: e8fb468f67bca1564ff499175d1b146c6ccd5d3a
outline-named-label = ，名为“{ $label }”
# en: 02d7116f49a426f4a9dba7a6582ae90478795f7d
outline-book = 一本书
# en: 8f9c05748f1616a4649174a8917da3ee5f3217e5
outline-decision = 一个决定
# en: c35876d5fcc88c6a4c142c7c0e391dda3f92ca08
common-talk = 一场演讲
# en: 69d33e95f4f69c18d9591a8529f59a6703fc1f85
outline-empty-outline = 空白大纲
# en: b972f73739624a697a0aa9bdde4289bafc5b6e4b
outline-outliner-ideas-under-ideas-folded = 大纲工具：想法下面套想法，可折叠展开、移动和连接；演示文稿或思维导图读的也是同一棵树。
# en: 3d47762769e98192ca611ea7fce028e70e16f174
outline-arrow-from-from-to-to = 从{ $from }到{ $to }的箭头
# en: 081c7d75d7a6b1052f5643338773de8ea68de0dd
outline-arrows-both-ways = 双向箭头
# en: 1e1c0cc8db067d827d10382e4329a748d2e3b54d
outline-as-page = 作为页面
# en: 16b6e0c696afc500fe76af1de5165a0563e80afc
common-calculator = 计算器
# en: adab5090ac6a1b7b5420faac7be86c41721ba27c
common-calendar = 日历
# en: ab732cac31bba434b0b59309a30ce46956dc3d54
outline-cancel-connecting = 取消连接
# en: 5301648dcf6b53cefc9ed52999aaa92d4603cae0
outline-change-it = 编辑
# en: 1ed0b58d18ef647be5de11840bb929ecc8e36446
common-chosen-items = 选中的条目
# en: b65463cb6a42a17de514acc4659f7fd331e0876a
outline-connect = 连接
# en: f2ea879cf86d5519e3459e15ee70080a4a1306ab
outline-connect-from-words = 从“{ $words }”开始连接
# en: abfb16b3d00afef63f7ed53ad9ababbf2328b5d9
outline-connect-from-to-to = 把“{ $from }”连接到“{ $to }”
# en: 378e916868a3e40a71abc67a748f7faacc94be85
outline-connection-from-from-to-to = 从{ $from }到{ $to }的连接
# en: 8f3509b64e0ea82c53329cb49a7756bd1ced3566
common-connections = 连接
# en: af74f7c5362aaee985bf8cda3dd75fc80751ce51
common-copy = 复制
# en: ba97113463234ae7bc314eae6a172572b35b1b71
common-presentation-builder = 演示文稿
# en: 20dcb3b3184067197035f08a5a3955d51fcd94a3
common-diagram-maker = 图示制作
# en: 0d84b3e5992959bf9adbeef94468228a5827605f
common-drag-to-move = 拖动移动
# en: 52db9dc3ff903f6d241a91adcbd83848467106c2
outline-draw-as-mind-map = 画成思维导图
# en: 03683dee41f9db7fad6f8d06c6c6bd776b528ba0
outline-draw-as-network = 画成网络图
# en: c01d65d48941d40cf0e4bad6bc84c525d99421da
outline-draw-as-org-chart = 画成组织架构图
# en: 3159fe421b3221381b3c778dc1c3c26e4540be37
outline-empty = 空
# en: 4a66d1480779180159cc25c1c5aa9d760467c6a7
outline-everything = 全部
# en: 9cf188d3a6779d63b36b10275b0228ae22ec97d6
outline-fold = 折叠
# en: ec898362fe9593764e822dd17c78f1f972c20d90
outline-fold-all = 全部折叠
# en: ecdda59aea5ee67d7d854c969ccf7f4f4b4a4c54
outline-item = 条目
# en: 6f8c7dbc09548197b5d210f514dda19a015102b2
outline-item-n = 条目 { $n }
# en: 120ee44bec923665b04dc825b0307fe159232ce9
outline-kind-of-line = 线条样式
# en: 789062517bc27b8cb5c78b1e88041e5bef69b507
common-launch-plan = 发布计划
# en: 72eee0aaa10010ae7d362761115dfd7e064dd4d4
outline-line-from-from-to-to = 从{ $from }到{ $to }的线
# en: 2859ccc92143006360893c2a9cb1aaaa13b3928f
outline-line-named-label-change-it = 标签为“{ $label }”的线条：编辑
# en: 52d55422c1936db72f18f5b9e960c2719a3560d7
common-animator = 动画制作
# en: 260ff8ae7182fc851337b6b2fdb25f8cac2b8d47
common-move-down = 下移
# en: 8a58f7b7ea514cbdf9bb23a231ad4d03f0cd0ca7
outline-move-this-item-drag-it = 移动此条目：把它拖到另一个条目上
# en: b4f57cd0cd5c7d88461c1718646713dea47a36c9
common-move-up = 上移
# en: 5b2d4bd98ab95d9eae0b3c956cbf98aefe9d7793
outline-name-of-line = 线条标签
# en: 3aea913567c437a81d3c153ce49d321f64099651
outline-numbered = 编号
# en: 89db2d16f087d4e687143e9a0071f77af473f9d8
outline-opml-for-outliners = OPML（用于大纲工具）
# en: b22f39c9558f672318bf617175bf3daaa236c71f
common-open-in-new-tab = 在新标签页中打开
# en: cdd6290b6b2860663a3ff7c60cbe70af640e9c39
common-outline = 大纲
# en: d7f6278b9a3a511b82633cbd63a4e86e91bab2d1
outline-outliner = 大纲工具
# en: e57362d579b61ac9d08f5012ee0adf6fde22a855
outline-outline-lowercase = 大纲
# en: db2483000d154ca9fd74d41fc4e063a4b28faa87
common-paste = 粘贴
# en: e45795fb6033ae4ecc1e2e3610273fce71a317d7
outline-plain-line = 普通线条
# en: 9580fcbce0c31ceaa47eb583e5f7ce637fdc8a0a
outline-plain-text = 纯文本
# en: 67ea25b11508ee37fa6c09bc9d3a1d6aa9a30f96
common-show-as-slides = 显示为幻灯片
# en: 59df6d7de818cdbeb08aa7f083aff96c1bccd1f5
outline-show-as-outline = 显示为大纲
# en: b306a7c32ba84dd4adea8612dccc99c15065eb53
outline-take-away-connection-from-from = 移除从{ $from }到{ $to }的连接
# en: e963907dac5cd5c017869b4c96c18021c9bd058b
outline-take-it-away = 移除
# The compound bullet (Paul, 2026-10-15): the statuses a document sets in its head, a status's pill, a due day's chip.
# en: e92aab82fce62899699581b5597abdda8175f2dd
outline-statuses = 状态列表
# en: bae7d5be70820ed56467bd9a63744e23b47bd711
outline-status = 状态
# en: c206561903295f2cf5944906fdfc55f1e8a5d45b
outline-no-status = 无状态
# en: 1bcdd54c54c2bbd162c6353f5157804ce2270af5
outline-status-status-tap-for-next = { $status }。点按更改状态
# en: 4c1aeebc433bcb8eb4b05434619ea3136b785ea8
outline-due-date = 截止日期
# en: bfe11361dd8dc7cc66f5cd6f33d394a95c71c96c
outline-due-date-ellipsis = 截止日期…
# en: 1cfca97d4ac1000c67f7b345992a5b58b3dac4b0
outline-due-date-change-it = 截止 { $date }。点按更改
# en: 6cf55f3558276e2eefff5dd41ec206dc9780bebf
outline-remove-due-date = 移除截止日期
# en: 891e9d6d47f1bacfcba2dca1b282afcbcd25d94d
outline-agenda = 待办事项
# en: aa73cdd3260a16a41d572c06ee0da42cb4b85286
outline-by-status = 按状态
# en: 0e719dcbe720c315d66c977072f10251b56bd994
outline-nothing-to-do-yet = 还没有待办事项。带有任务、状态或截止日期的条目会显示在这里。
# en: 064c87e25e9cca38db987bafd98c9fc9b3003456
outline-line-to-parent = 到“{ $parent }”的线
# en: 99fec066e5bc2f5acc70261b4b5dd4b171fb491a
outline-arrow-to-parent-item = 指向“{ $parent }”的箭头
# en: e37f9b066587aa06d9d2f6df504727599d9f5e4a
outline-arrow-from-parent-item = 来自“{ $parent }”的箭头
# en: 27228d1a3266064e49da7e3949d339b08473e294
outline-edit-statuses = 编辑状态…
# en: 70dfe3298343e43d0c29f07274084a4ce961dd7a
outline-add-status = 添加状态
# en: 4f9beff18cc6852b012093ba97421788466bb3bf
outline-gray = 灰色
# en: 23376bab580fd3f3d521c66a65a03e7753da54cc
outline-last-status-means-done = 最后一个状态表示完成。处于该状态的任务会被勾选。
# en: 7312a31a2c880f2d456663b6f91ad6da980b3a5e
outline-take-connection-away = 移除连接
# en: 656e5c87ae5cd391807e13c85fb32635c2d441c2
outline-tap-item-to-connect-from = 点按要从它出发连接的条目。
# en: 7a717eefe223e502e86655b5bf8eb999b867a9dc
outline-tap-item-to-connect-words = 点按要把“{ $words }”连接到的条目。
# en: 6ca2aebe7601f4f49f7f7df1ac23a0ac4a39abbc
outline-question-options-under-it-and = 问题，下面是选项，每个选项都列出支持和反对的理由。
# en: da74cb6baba7a464fd8881af861a8c8d7952aff9
common-trip-planner = 行程规划
# en: 09ae5dce4d22019190e52d1611d1544becf36489
outline-twenty-minutes-in-three-parts = 三部分共二十分钟：问题、想法、意义；显示为幻灯片时，每个顶层条目一张。
# en: 2af9d498f852995329b0033573277dce32d09ba0
outline-unfold-all = 全部展开
# en: f5857a77d395db75bc57c2c76b92dc8fa4773053
outline-unfold-n-inside = 展开（{ $n ->
       *[other] { $n } 项
    }）
# en: 621521f9a8788695ec292cbec54d2792cfdf0a7d
common-untitled = 未命名
# en: 1e65f823e3600c2c4cec7aff6db37af296fca073
outline-view-as = 查看方式
# en: 828c360c884f9246750461eea43fee4e42c6b52c
outline-zoomed-in-on = 聚焦于
# en: 38eca6735f66d186c0bd9c549873e774551dc35f
outline-a-plain-line = 普通线条
# en: 884abd948f43aba4e5851b71a20e97aed7a6c96e
outline-arrow-from-parent = 来自上级的箭头
# en: b1efb9ef91ffdf7d42595fb81fb8b74184a5efbc
outline-arrow-to-parent = 指向上级的箭头
# en: 54406ea0a263efcf4d3204fff2200f7f4d982c90
outline-arrows-both-ways-lowercase = 双向箭头
# en: 0048342aeabb8b2918689354650579bb2108a957
outline-e-g-owns-feeds-reports = 例如：拥有、提供给、汇报给
# en: e7292866259d82c2071011b0e5de8b80407998e7
outline-item-above = 上面的条目
# en: 973c239ffbd8d0522cea9cfa9e2664d2a96a2e01
outline-this-item = 此条目
# The templates: their names and blurbs (templates.md says what each is for).
# en: 5c3a8ec4fdc8ab96e7ef9f3a0739b0639c6ca926
outline-company = 一家公司
# en: 8a7edf5c70300a3c146de3a15b534939e72226da
outline-decision-tree = 决策树
# en: c59b4e8c614eaaf02a0ac81499bc50947192118e
outline-family = 一个家庭
# en: 3ac1f9e665cb59f3a08ee0fba150dbbf4aab85a8
outline-five-minute-retirement-toast-opening = 五分钟的退休祝酒词：开场、三个故事、祝酒，每一段的时间都写在它那一行。
# en: 9ed550a11b44d369413c1b004a5008d3c127a6c1
outline-novel = 一部小说
# en: 35c9710d58daeb1aebb2143cfaeda278f0f67311
outline-product-launch-product-marketing-and = 一次产品发布：产品、营销和下面的支持，各分支之间有连线。
# en: 79fd5c646ff9b077d10357db663c9b7d59acb64f
outline-research-plan = 研究计划
# en: 6a1ae380627dbc8fe79ff6a208c76b89d230979e
outline-speech = 一篇演讲
# en: f081caaa6b5cd7b0858a4a87cc6f81bdb215fd30
outline-syllabus = 课程大纲
# en: 5b163ae0d9a3fd9b5ab6a8b6c27374091ceb25de
outline-ten-week-course-when-and = 十周的课程：时间和地点、每周一个带编号的主题、如何评分，以及读什么。
# en: 9cea5f42a5742d9eef722836a7a7b59c6a5c0c5a
outline-thesis-two-arguments-with-their = 一篇论文：两个论点及其证据、反对意见与回应，以及出路。
# en: e5f2a2c3f76b55d5786f1c311773def62d6920f3
outline-essay-plan = 论说文提纲
# en: d926d538e1be8112e81292507985514feac5e4c4
outline-draw-as-family-tree = 画成家谱
# en: bfef6f97dfb8178f726a96b8861bc2536e8c6fb4
outline-five-days-in-lisbon-packed = 里斯本五日游，按类别打包，附出门前要做的事。
# en: 987acdf86bb6a373c995aa374c004bb21bf2e576
outline-indoors-or-out-for-saturday = 周六集市在室内还是室外：每个问题的答案各占一行，是或否。
# en: 61390a6b5d7d9268827d91b4a818c6a5fbe2011c
outline-no-internet-at-home-question = 家里没有网络：每一步一个是非问题，一直问到该打的那通电话。
# en: b431e4b41d5021ff680bdee33aebda8738cec5b0
outline-packing-list = 行李清单
# en: 013532bb7e7d08afa22a3149f8e74b5ee4d9eaf5
outline-parts-and-chapters-of-book = 一本思想之书的各部分和各章，每章下面一行写它的论点。
# en: 5f646cfc8f40ae2515c9d774ae5ad523f524b998
outline-people-and-three-acts-of = 人物和三幕各章，每章写发生了什么，人物改变章节处用连线连起来。
# en: dbb00953c7a1565bffce71190cfb90220362c471
outline-question-method-budget-that-adds = 问题、方法、自动合计的预算、时间表、风险和阅读材料。
# en: 57b065618d9af543d6fcc5085edd94aa723f8403
outline-three-generations-and-next-each = 三代人再加下一代，各有生卒年份，可从菜单画成家谱。
# en: 285ec850c11d78bac10f6bfa31b69a37f1b257c9
outline-troubleshooting = 故障排查
# en: c126bf3ee80a183d7c300cd69a01e39ab7dd8e53
outline-who-works-for-whom-at = 九个人的面包店里谁为谁工作，各有职务，可从菜单画成组织架构图。
# en: 0c6266451117f0382231513e4c30d38fb976086e
outline-pdf-sections-and-bullets = PDF：章节和要点
# en: 32897da2f696f1ddc73da9ef0575827530a80b1a
outline-fold-unfold = 折叠或展开
# en: 74341e3c271df3c784e595b804b1f90be0f80429
outline-name-line = 标签

## the Presentation Builder

# Its templates: the occasions and a second of each printed format.
# en: 44467d7b18daac8d8100b68ebc482fe0ee0ac9b6
deck-choirs-winter-concert-welcome-both = 合唱团的冬季音乐会：欢迎词、上下半场、乐曲说明、歌手，以及可以跟唱的歌词。
# en: a816093d69f08b81c457d818e6d1bd72e0915b10
deck-lesson = 一堂课
# en: e2d04797e440ee0933d032a29cfbfad5edbc99c7
deck-lost-pet-poster-in-red = 红色的寻宠海报：名字、样子、在哪里见过、联系电话。
# en: 4d44cafa1d032ca3ceda90fa9830717ea5cf8491
deck-morning-workshop-schedule-checklist-of = 上午的工作坊：时间表、要带什么的清单、步骤，以及下一步去哪里。
# en: 7dc13283809d7ed9c506873aee1486fd988cfe5c
deck-pick-your-own-farm-what = 一座自助采摘农场：什么时候长什么、怎么玩、价格、谷仓和怎么找到。
# en: b822b42bfed453711aed6a262083b2a7aef5cd89
deck-pitch = 一次推介
# en: a9964d2d4aae75e70e2e8dace25022b6679f25d7
deck-product-in-sentence-what-it = 一句话讲产品、它能做什么、表格里的价格、发布日期和媒体联系人。
# en: a46e6eb74ae783d7eb35ae76afc5ab984683886f
deck-trivia-night-in-four-rounds = 分四轮的知识问答之夜，还有一张得分表，答案在最后一张幻灯片上。
# en: efebc637859160a6f694e66576eebb294de14712
deck-residents-meeting-about-new-playground = 关于新游乐场的居民会议：为什么、提议什么、饼图里的预算、何时、怎样发表意见。
# en: 02e7a62fc65ed26cb0751706a5ea8f5783414eda
deck-science-lesson-on-chalkboard-aims = 黑板上的一堂科学课：目标、已知内容、模型、检查、作业；每一页下面有教师备注。
# en: f3a66c7b2a6ebda85ea74938fce4c397eae2a131
deck-seed-pitch-in-eight-slides = 八张幻灯片的种子轮推介：问题、产品、图表里的增长、商业模式、团队、诉求。
# en: aab8da6eadee157bba3937e9dc00741cfe48b13f
deck-bike-shops-quarter-for-its = 一家自行车店向合伙人汇报本季度：图表里的营收、成绩与不足、关键数字、下季度。
# en: d0fa5e5696edaf949dfe9e739a7a2eef0d433ae2
deck-small-story-in-panels-about = 一个格子漫画小故事，讲向邻居借东西。
# en: 6c1ff81a2445a9eab1616588060b483cd5b6cde8
deck-twenty-minute-talk-with-speaker = 二十分钟的演讲，每张幻灯片都有演讲者备注，附结果图表、一条脚注和心得。
# en: 1a2fac58a0b80e771b6d2e526e7d3fee2cf6ef85
deck-badges-for-conference-each-with = 会议用的胸牌，每个都写明角色和来自哪里，用“海洋”风格。
# en: 7aa6a43fffd387b34fc7d06c7845de3f5bef745a
deck-comic-umbrella = 漫画：雨伞
# en: 1796880ad702715de60aad7227c9bdca655f0fff
deck-concert-program = 音乐会节目单
# en: 3843bc86872f81764fe670a10bd1192b5a78018c
deck-conference-badges = 会议胸牌
# en: cae2fc32956e250bfadb1c6411ff593e325cf580
deck-conference-talk = 会议演讲
# en: 27fa527134938f2343573a9c4485c57bc7e6167e
deck-farm-brochure = 农场宣传册
# en: 6bd753630675cfdfe68c546580b14419bd8e80a4
deck-lost-cat-poster = 寻猫海报
# en: dd7cf099a356a9e69908104ae2d8c2743ba41fb7
deck-product-launch = 产品发布
# en: 68d708c4452b9eaca2d5d38e9d0a5848059fd138
deck-quarterly-review = 季度回顾
# en: ca40a6181df561c65b71e9ebdf580ccae6b007b7
deck-recipe-zine = 食谱小志
# en: 02bfd82260b75fe685e4e972cb9a3ae9b0a42f5f
deck-seven-soups-for-cold-week = 寒冷一周的七道汤，一页一道，做成一张纸折成的小志。
# en: 44b5c7f041391d8b41a8ba365b6f13522877b478
deck-their-story-for-reception-from = 他们的故事，用于婚宴：从怎么认识到那一问，附时间线和一段感谢。
# en: 2aaeb944a6b05f452d512dc7dd5220adeee294ea
deck-town-hall-notice = 社区公告
# en: 14444c384d263fff25ba48b195abb55def791b75
deck-trivia-night = 问答之夜
# en: 0377beb012ed13e1986227ef8915aeab709ad5d9
deck-wedding-slideshow = 婚礼幻灯片
# en: f34f4184c545fd4fec60bbc441ead88d1f1fdd1b
deck-workshop-agenda = 工作坊议程
# en: e4c8d951f1cc300d96873c7cfc850ad0f0ddaab4
deck-presentation-lowercase = 演示文稿
# en: 1e35470a39e5b3ddca4d3b585c9011db9b4c4dc6
deck-slides = 幻灯片
# en: 5075541433d31fb8cf207ced97577686ac3fe961
deck-chosen-slides = 选中的幻灯片
# en: d7935967cfd3de8f11b33801800bece8d90cb55f
deck-move-this-slide-drag-it = 移动此幻灯片：把它拖到另一张上
# en: 19926fc5c47a7a39dd1435da06e3fc4c027458ea
deck-slides-titles-bullets-two-columns = 幻灯片：标题、要点、两栏、大图标，以及放在幻灯片上的其他文档；或者可打印折叠的小志、小册子、宣传册、漫画、海报或胸牌。

# The layouts, the transitions, the formats
# en: 7509c5747e5db3dfa3373afc42eca9f5b27a8599
deck-bullets = 要点
# en: 8d8f0f25822179c33b917613ec2d022ef593c340
deck-two-columns = 两栏
# en: 1d6bece457daf37f906239468dadfdfb619adb98
deck-big-icon = 大图标
# en: 5298d08bb7ae7d01f4efcdbb94ff03fc487fd11c
deck-fade = 淡入淡出
# en: 38d13bda5c40afc32d629f81dec6c156cbea328e
deck-cut = 切换
# en: 38d13bda5c40afc32d629f81dec6c156cbea328e
common-cut = 剪切
# en: a5d5b46a7720824b51da4be0af97f5cfd1168cd0
deck-slide = 滑动
# en: 9b3cbed5c490c07473546a88768ba29b787e9e52
deck-zoom = 缩放
# en: d4ff278598ebbd3f36cecf27e68c66de49d2f62f
deck-zine = 小志
# en: 8ef5c45547ec6440e6dde4870e3f92d6c08dfbaf
deck-booklet = 小册子
# en: 80dceb58c1f9daca0ebaa066d80e670cfdf1123e
deck-brochure = 宣传册
# en: 5549c5222b1b1eb52e37ae3542dcc0f7cb9fd376
deck-comic = 漫画
# en: a33539ca77a6c42fd7a1e50aef1516b3a87d7c85
deck-poster = 海报
# en: be13a787e958beeb3139d8e1b3ebc2b879732db2
deck-name-badges = 胸牌

# The themes (the Look menu) and the icon colors
# en: 34118050b206b7ee3e5bcb8e4adbe8c17630020d
deck-plain = 简约
# en: b6369ed60eb9bda1aa642868ddfb5053547f0206
deck-boardroom = 会议室
# en: 39973be20679a94e4c998a58c0f6c76daaf6cd11
deck-ivory = 象牙白
# en: 558287ddcc3557b09ec00ca17b3e4be7e6645858
deck-midnight = 午夜
# en: 220c98deb1482e5b5361b123b929ee8e4ac1e18d
deck-graphite = 石墨
# en: 79141e063e10bb80a7b799878f12312eb89fbafd
deck-confetti = 彩纸屑
# en: 181bcd5760fd32163554c899301a30b2cd381cf4
deck-sunset = 日落
# en: 76022a00a16b0482beec04274945ed192a931410
deck-ocean = 海洋
# en: 07a59415416c4f5915d5efbe6319ca69450f0a77
deck-bubblegum = 泡泡糖
# en: bc727a101b60bbc2b4f96365ecf1ee4bd1db685a
deck-arcade = 街机
# en: 5efe442a0ed9b1e51ec7e85696d66d6ac3db83a8
deck-chalkboard = 黑板
# en: 5f941ab65fbabe87f41cd73c9136f5a4c97087e8
deck-fun = 趣味
# en: 0bd48966c3fe51c025c34a472af7fac64b2292dc
deck-themes-color = 主题色

# The bar
# en: 4e9f7a31eef4c69e0aacb643f6856372cd6e3247
common-present = 放映
# en: 3c47e73f6a8bcb018bdbe91d9312e8e1777050f7
deck-see-sheets-to-print = 打印版式
# en: ca742a9ecf2f35a59704398ead009f1d8e554a0c
deck-back-to-pages = 返回页面
# en: 442250df38e5e516ff1c2ce97d051b8997c7d976
deck-headline = 大标题
# en: 1cd715cdb2322da76e4ce7f490064782c83337b2
deck-layout-layout = 版式：{ $layout }
# en: e85e5488b4184d6cfb4c0aa36e169a271068ec0f
common-look-theme = 风格：{ $theme }
# en: 896afdc59964bf4da2b261b6056d23286d186427
deck-transition-transition = 转场：{ $transition }
# en: 438dcf262325319835f0d0aefa8a4ecddaf49a16
deck-format-format = 格式：{ $format }
# en: f16eadab2a72ff13044cc806dbcf2c117b32244f
deck-printing = 打印
# en: d5939283a7a53a72f09e4f327bc22f2872b64257
deck-one-sided = 单面
# en: 256dd8b8869a6c72f553a2905aef393f2b39df0d
deck-fold-and-cut = 折叠后剪开
# en: 8cb849ee6e612fbad8641d053d8e66b2ba560a1b
deck-two-sided = 双面
# en: b82a2c3204554a9c0a82b44aa7eb5f94916b1c13
deck-cut-and-nest = 剪开后嵌套
# en: 6e19d7b7deffd2974f632ec3e697646de978130e
deck-end-with-qr-code-of = 以本演示文稿的二维码结尾
# en: 0c7dca360d478b76246b0ddf594aed2299af3ef2
deck-move-slide-up = 幻灯片上移
# en: 8e87a8ca3749be93e307f172d62814c1b58865b4
deck-move-slide-down = 幻灯片下移
# en: 3a260e90c0d893d60ed227c10bfade84b5a2adef
deck-delete-slide = 删除幻灯片
# en: e984a8f80b4d34ad2ca73e2a3a432a6a08a6db27
deck-move-page-up = 页面上移
# en: 21c3799bf3525e9642bab926aa4f81f07a5d8a0f
deck-move-page-down = 页面下移
# en: 260b69625056e26e4029491cf672306054bf10a6
deck-delete-page = 删除页面

# Insert
# en: fffd75e48f61364f8486681ac4213184abd2373f
deck-bullets-slide = 要点幻灯片
# en: 6e281f49affc0fc305e572fc6d08a6ca82a597a1
deck-title-slide = 标题幻灯片
# en: 8401be1cb1b1122b954639aeea6e348e2c709b23
deck-two-column-slide = 两栏幻灯片
# en: ecca8f3f7107aaa37ae2674734c101faac7e3e11
deck-big-icon-slide = 大图标幻灯片
# en: fb06270f7c212baabc8749ffc36e49dc8f321548
deck-page = 页面
# en: 31f820710f9d6c3e03e8b9e5996902c45a8816da
deck-title-page = 标题页
# en: 9b0d34e9841a2c5fa15e4c9e68c01f338dc34930
deck-two-column-page = 两栏页
# en: cfdc49e689f75ddfc0372d83f7c9a396b6616dd8
deck-big-icon-page = 大图标页
# en: 17a4bbb4cefcb0a1fccf38f1c561b2a18fe44456
deck-four-more-pages = 再加四页
# en: a59879f8796236335931a0b95f1cb1a1db39e210
deck-on-slide = 幻灯片上
# en: 9bab04556dc2a912d86a00f7b4dcd7c540468b8b
deck-on-page = 页面上
# en: 600584c2d5ccb97c0c0c424d9f32d6b102fcb040
common-pages = 页面

# The canvas
# en: 028137d1d6f1cf21777ce8a83b467b80e04a6168
deck-add-icon = 添加图标
# en: f68895d5ec9c6f1865e9ee69f1d423cbfd251599
common-change-icon = 更换图标
# en: fd8de0a92eedac5ccdf6c587b3ae177b97da0ae0
deck-pick-icon = 选择图标
# en: 3805391efb1ea53cff43e62a0dc134be9b14bd8d
deck-left-column = 左栏
# en: e8965b7c19d1ad62de75e624088e40b37d16f206
deck-right-column = 右栏
# en: 58952208e1b00c3e046eab00b1e20bb448262df9
deck-one-bullet-line = 每行一个要点。
# en: a32090c9358d8e112f4074c11a76811a50d53d5c
deck-one-bullet-line-tab-steps = 每行一个要点。按 Tab 缩进。
# en: f8948a4a523b4312c5567f9cff1f6788c757998f
deck-line-or-two-under-title = 标题下的一两行
# en: 236bcf1c6a83d3b0f85a065c777d7948b22a0c22
deck-what-this-page-says-type = 页面文本。文字会自动缩小以适应页面。
# en: e80e281dac24d9c4c3f60dcdbf8700e9603b825e
deck-panel-line-what-is-said = 每行一格：台词 | 图注。用“图标”给它配图。
# en: 3d6e76c9325034deb76b92c8cc47a2d3c22fcdf3
deck-speaker-notes = 演讲者备注
# en: f0ea152b4f68c54e5bc3476bae70301bc7fb2523
deck-n-total = { $n } / { $total }
# en: 3b73ff036c4ba5dc509f9a2e55189b33fc8013bb
deck-document-on-slide = 幻灯片上的文档
# en: 800ddde9b84d77765694212f6af1a9ed4329c77c
deck-remove-from-slide = 从幻灯片中移除

# The rail and the sheets
# en: 7e4475e68efd3a93e2aa3ad794afd9388b4c89d1
deck-slide-n = 第 { $n } 张幻灯片
# en: 5f78f871f6b48ae876a1dbe89a5b8bff6f6b9849
deck-front-cover = 封面
# en: 95842f717432a63230077bc5ea48addf5bc52947
deck-back-cover = 封底
# en: 10e4725d5544e065501162abcf8a53b94451df0c
common-page-n = 第 { $n } 页
# en: dd19f9887573a9f06294de48329bfb1b3a5ad273
deck-front = 正面
# en: 6f453fd2a404a86955b0f23219d84f2bcb4e7d06
deck-inside-left = 内页左
# en: 4fe87c5667532867fc721531b92a7ca6b391eb8a
deck-inside-middle = 内页中
# en: 3e654f345b202e7b158b2c61ff91fe55b0d3d46d
deck-inside-right = 内页右
# en: 418bf9a5530258c65b3dbc1f932667dafa01469c
deck-inside-flap = 内折页
# en: b52b36b7269fbfc58ec24bb724691951a3decbe8
deck-back = 背面
# en: 3369aa225b34e01144a4c49dd350db04732a2720
deck-badge-n = 胸牌 { $n }
# en: 9cc25309d07de0adfb989faaaaa74f7cb5a06e38
deck-last-slide-added-for-you = 最后一张幻灯片：这份演示文稿的二维码
# en: 03c90c8e6a7e028c2e9caeadc1961fb5c0ad4e57
deck-ends-with-qr-code-of = 演示文稿以二维码结尾，方便观众带走。QR 按钮可以关闭它。
# en: 13c7cb226b093919972f5e423aeb0abae93960cf
deck-qr-code-of-this-deck = 本演示文稿的二维码
# en: 5d5bc5601280c776405941347bbf7e9c63dc3954
deck-sheet-side-n = 纸张第 { $n } 面
# en: 1982f74c2102a55783a4774ddd4895dc7fec26f0
deck-cut-along-dashes-this-half = 沿虚线剪开 · 这一半朝外
# en: 0fc0c2932d66df46e1af55ac50d98be2bccd63c3
deck-print-on-back-flipped-on = 打印在背面，沿长边翻转
# en: e0226944c5e9e4df97a3bf718ac488a8a51118fa
deck-cut-along-dashes-fold-along = 沿虚线剪开 · 沿点线折叠
# en: b0ccda7ec0d37c14d00e5e9f57eeadcb1045ebd7
deck-print-it-double-sided-on = 用 Letter 纸双面打印，沿长边翻转，按实际大小。沿虚线剪开，把上半部分盖在下半部分上，然后一起从中间对折。
# en: 7d7f71d31c8968c0555f49f9430133796d626c4f
deck-print-it-on-one-side = 用 Letter 纸单面打印，按实际大小。先沿长边对折，再折成四份；沿中间的虚线剪开；把两端推到一起，折成一本小书。
# en: ce30358159a7953f092af19e48f7dad47608c83d
deck-print-it-double-sided-on-letter-paper-flipping-on-short-edge-at-actual-size-stack-sheets-in-order-first-on-outside-and-fold-them-together-down-middle = 用 Letter 纸双面打印，沿短边翻转，按实际大小。按顺序叠好，第一张在最外面，然后一起从中间对折。
# en: 96bf1a2ba3e6d649669efc225b3104521735ff25
deck-print-it-double-sided-on-letter-paper-flipping-on-short-edge-at-actual-size-fold-right-third-in-then-left-third-over-it-front-is-on-top = 用 Letter 纸双面打印，沿短边翻转，按实际大小。先把右边三分之一折进去，再把左边三分之一盖上去：封面在最上面。
# en: 6d4cc8d4405840522000283a7e419c1c93e89392
deck-print-it-on-letter-paper = 用 Letter 纸打印，按实际大小。
# en: f81a8cbfa80cae20e64c2c1dd92fec6cfefba6c9
deck-print-it-on-letter-paper-at-actual-size-cut-along-dashes-six-badges-sheet = 用 Letter 纸打印，按实际大小。沿虚线剪开：每张六个胸牌。

# Presenting, and the closing slide
# en: 6e875951a6f9aa1374d93572de657c12ded57355
deck-presentation = 演示
# en: 50f94286ba30706a19070d3ec0a0c8d34d6cf6eb
common-previous = 上一张
# en: bc981983e7f547dc62e19a1e383acfe00782a6d5
common-next = 下一张
# en: 10225bffa1614015caa499978578b424eb0ee56f
common-stop-presenting = 停止放映
# en: 1380030776f8bb0e462fd6e828a563e49da50652
deck-slide-n-of-total = 第 { $n } 张，共 { $total } 张
# en: 70440046a3dc2e079f23ee1c57dfa76669b732aa
common-notes = 备注
# en: bd0dad7cbf71b13b2e545d8ce477027ffc106b45
deck-n-hides-them = 按 N 隐藏
# en: 45c44dc2566819f835fd788e2b7a6c5bee5177c4
deck-take-this-deck-home = 把这份演示文稿带走
# en: acc1edc431e346786fab17d4f10e195ca72257d6
deck-take-this-deck-home-title = 把这份演示文稿带走：{ $title }
# en: 7fc2d8c7fd4164039149b5a9f2063ddf7ab9d76a
deck-scan-code-whole-deck-is = 扫描二维码：整份演示文稿都在链接里。
# en: a0f82f698bc01f5dc90c760db684589e2d8277eb
deck-a-qr-code-of-this-deck = 本演示文稿的二维码

# Downloads
# en: a149055ecee5f95be2951f0b5454f3d1ef47c786
deck-powerpoint-pptx = PowerPoint（PPTX）
# en: 7660a22bdc9507edd353dd61198b9aa86488d936
deck-picture-of-every-slide-zip = 每张幻灯片的图片（PNG，ZIP 打包）
# en: 98a41f54e049532b6032b88d7656348adc178c2a
deck-animation-of-deck-gif = 演示文稿的动画（GIF）
# en: 3bab526d831e1024e6f8e7d197f9c3d72cc4f0e4
deck-film-of-deck-webm = 演示文稿的视频（WebM）

# The templates
# en: e5604bc465a212ad3d7f4e13ed282f030d9d3a6b
deck-title-agenda-three-points-with = 标题、议程、三个带演讲者备注的要点，以及结尾。
# en: 60c974074604818e661eff7940285669d1496647
deck-status-update = 进展汇报
# en: 34714be3698c31c72afb1d4d4b8a7b0c69f30fc5
deck-done-and-next-side-by = 已完成和下一步并排，然后是风险，再然后是请求。
# en: e946db45d2689df95cbac9f8137664409c51f5d8
deck-proposal = 提案
# en: 52ab7599cc26432ef9b492b401d04eee1ca5e699
deck-what-you-heard-what-you = 你听到了什么、你提议什么、何时、花多少钱。
# en: b8e1f28fed63f996c8915470a7ee9ce8aef9b75f
deck-eight-small-pages-from-one = 一张纸做成八个小页：打印、折叠、剪开，或在手机上点按阅读。
# en: 31b11edde49cd1bd80a198f240426c5b2d8cd65f
deck-booklet-of-half-letter-pages = 半张 Letter 大小的页面组成的小册子，八到二十页，排好版供打印、嵌套和折叠。
# en: ae07389f7b537dbd7eb3007d3f2b36ca3c35c404
deck-trifold-brochure-six-panels-on = 三折宣传册：一张纸两面共六个版面，每个都放在折痕需要的位置。
# en: 88c71dbca35b2e7c498adce21174cb1102af384e
deck-mini-comic-panels-with-picture = 迷你漫画：带画面、对话气泡和图注的格子，用一张纸折成。
# en: e610bb7f6eac1dd5622723ccc779e31e9d9ed190
deck-poster-or-flyer-headline-and = 海报或传单：一个大标题加几行字，尽可能占满一页。
# en: ec024ffdc152af00e77f7219a5293545bdd3bb65
deck-name-badges-for-meetup-one = 聚会的胸牌，每人一页，一张六个，可直接剪下。
# en: 9a51ba7142888f3e0199896de291a1fb4b4298f1
deck-edit-this-deck = 编辑这份演示文稿
# en: d5947c525ed0d53dce794385a2cc1cd6e2459dbd
deck-new-slide = 新幻灯片
# en: 720856fcb53d62f79a364c36d8cd2314121430a6
deck-presenting-back = 返回（放映）
# en: a212c73bb85a53b57609d239c50f170773e07d77
deck-presenting-next-line-or-slide = 下一行或下一张幻灯片（放映）
# en: e53a09169fa399b79b5b814de5e65669714f9165
deck-presenting-whole-slide = 整张幻灯片（放映）
# en: 7722768d8b861ddedb1f6400352985ca0cfd4a08
deck-slide-before-slide-after-on = 上一张或下一张幻灯片

## the Calendar app

# en: e4ffacba5591440a14a08eac7aade57c603e17c0
cal-calendar = 日历
# A span is an event on the calendar or a task on the schedule (the Gantt view); { $every } is "Every week" and the like.
# en: 11fcad4bfe2782393e5d2ac5e04d65349890ea94
cal-name-yours-say = 一个名字（比如你的）
# en: e288d42e3bba2f9fc3b7f2287d2ea4f141e72236
cal-schedule-phases-with-their-tasks = 一份日程：各阶段及其下的任务、每项进展到哪里、末尾是发布。
# en: f0424f3e15f33d07de80ddfd02a4b56f047767d7
cal-week-earlier = 提前一周
# en: 5e63d8681fdc3170ed99fc3abcc3668620f299ca
cal-week-later = 推迟一周
# en: ab455a2fb151da1c7d0c39c7534c2f935e028ce9
cal-weekend-of-sessions-at-set = 一个周末的演出场次，各有固定时间，最后一场过了午夜。
# en: 114574336ac7883aebd0653b3fc5e82f9262dc86
cal-all-day = 全天
# en: cbf28df446643f9968f7fe68968bca51be5cf792
cal-chart-scrolls-sideways = 图表（可横向滚动）
# en: a13d5b9d3da48c8bade3d645e0de9a9bb812c648
cal-color-for-new-color = 新建项的颜色：{ $color }
# en: f6bb0f468a8569c67b3d6826e57e62c5500c3681
cal-days = 天数
# en: b50e483c45f8f17795b63f822127ff0171086900
cal-days-and-times-on-month = 按月、按年或按日程排的日期和时间，可用任何时区。
# en: 9ccd3e7bb11493f1e93950f7db9148a4794037b7
cal-done = 完成 %
# en: a7028454f240815938eaf701823b7d55dbaf98a9
cal-edit-event = 编辑日程
# en: 8a4d4e6eb9a367d616b8a4cbfa2792068482e884
cal-edit-task = 编辑任务
# en: 99570f85bb2bae0dbe3e8f2f3d6d6f765ee7c47e
cal-choose-task = 选择{ $task }
# en: 72b4644a41881ce4e156ce3283119c74f598cbea
cal-day-earlier = 提前一天
# en: 8d6915ee723c8b3c01f29002cfed7d597d56c2c7
cal-day-later = 推迟一天
# en: 66a755ea0d935aeac763da63deebb69b0eb54ba9
cal-dates = 编辑日期…
# en: a2bb9d34b8a1a79665858d354585cf147e0dee4e
cal-end = 结束
# en: 89d10cd6c1e1437d6318d6fbb25a40e0aaaddd34
cal-end-date = 结束日期
# en: cd7800da7f4ff94a0e14445d7f94b6345d1b7b8a
cal-end-time = 结束时间
# en: 91856dcb7d93f9c6725649160ab6abe379d8e5c9
cal-ends = 结束于
# en: ad8919ace091b14011c6439cfd5e1707b58f5abd
common-event = 日程
# en: 3b2eb5131055ad07ac1d08de2f11f900286a51b5
cal-every-day = 每天
# en: 7f3932f9cb96cb99072771c992c0ce3c0b342bfb
cal-every-month = 每月
# en: 043058e2050c0345ef7aac78bd9025d3adce099a
cal-every-week = 每周
# en: cea537cd72239840db0466ba29562d222299f7ce
cal-every-year = 每年
# en: 557ea666ac9eafe1543ea9c4423073c8be815d79
cal-family-calendar = 家庭日历
# en: 05061b43a7c1a210598d8a217347a96fdb45df8d
cal-festival-weekend = 音乐节周末
# en: a3f5851f7cb29b64859b01ec6429ea85811bb192
cal-how-many-times = 重复几次
# en: 834c5ef85d6fd469b8be75d8685faf6f9e84eaa7
cal-icalendar-ics = iCalendar（ICS）
# en: 4bcc328bf3b5b886738db678a175936615491289
cal-its-own-zone = 日历的时区
# en: 2a177256a408fa4fc557b301041589b798826d70
cal-last-day = 最后一天
# en: 58ef633830b461aa76bf4ee90e3b2831ff588508
cal-lessons-birthdays-and-holidays-color = 课程、生日和假日，每人一种颜色，每周重复的事。
# en: 7c7f5d049fad2569721d446c4a811f9bd5da5393
cal-level = 层级
# en: 082bc378cd60e17a38d99898b21955299c5b60c8
cal-month = 月
# en: 770d509550265dba792aa81868b856eb67225e41
cal-my-zone = 我的时区
# en: 80c3052d33ccdee15ffaaa110c5c39072495fe63
cal-never = 从不
# en: 2ef3795c979293106a6ccf13359d732165fb660a
cal-new-event = 新建日程
# en: 25d3553217b2058be97b5339fbe6a576cfeb6856
cal-new-event-on-day = { $day }的新日程
# en: 17b2b838c5ce22c961a36736534a5029d6ba0087
cal-new-task = 新建任务
# en: 8abf7cf1d0b36ff16ebbe26b8285a65d9d1582f6
cal-next-month = 下个月
# en: 22c6f667e4103029954aa28d43a1d4888122b35f
cal-next-year = 明年
# en: 1562a21cadb04e59b670cb3e32fb54f1777db699
cal-no-tasks-yet = 还没有任务
# en: 3b2069a4f745374e50f8992752888822ce851db4
cal-no-tasks-yet-insert-task = 还没有任务。请插入一个任务。
# en: 855dec4a50f5117b51b7f32b59771f28855942ac
cal-nothing-on-calendar-yet-tap = 日历上还没有内容。点按某一天，或拖过几天。
# en: 27d7bd5f744f76fc1ad85bbe975e9fdca473eaeb
cal-nothing-this-month = 本月没有内容。
# en: 46a299215300b3a0de6931f926bc6b0f2283eb99
cal-previous-month = 上个月
# en: 2f866c70871d37f90c24fefa28d87cc19d8850c3
cal-previous-year = 去年
# en: 580110a84277d369b216be5a01a5ba50868d4d3f
cal-project-plan = 项目计划
# en: 6ae5ee3e66205a8b1a41c80c4db0dcc982e50f44
cal-repeats = 重复
# en: 0a8adac9d6d5f4d14ee887d196cd8618f0f3391a
cal-schedule = 日程表
# en: e7fe53f0503eb82f8c80f9b233fa566339a9f9e8
cal-show-times-in = 显示时区
# en: 952f375412e89ff213a8aca383d18e5691354347
cal-start = 开始
# en: ff99f5b5f7948dfa71fd545b3d99f5f00856ea29
cal-start-date = 开始日期
# en: 88d8206d586abe4c8e35c8e9adcc649d07c99a1e
cal-start-time = 开始时间
# en: fc612a2fcc722bde9d98ae18bea42764812b6784
cal-starts = 开始于
# en: 0e648419ea806b0cc4db81617f95870a094f3639
cal-stops = 结束于
# en: 480b9be2834a2278919632171f788a9a80d5d743
cal-same-dates-as-gantt-chart = 同样的日期，画成甘特图
# en: 7ea6dec71584012ab4044cc464dc601741ff2c50
cal-this-calendar-is-written-in = 此日历使用{ $zone }时间。
# en: e10c10f818ac8e510b74062cde201eae4e8d8c66
cal-this-calendar-names-no-time = 此日历没有设置时区，所以时间按你的时区显示（{ $zone }）。
# en: 1b4785331db3b08cd8e3cfa4bd36216731a79e54
cal-this-month = 本月
# en: eea79afd832854a3b24153b928ee9c62c7457dbe
cal-time-zone = 时区
# en: bf5efde33adface92f37d1888e904ab70c9ce272
cal-times-in-zone = { $zone }时间
# en: 650642b1d6b4b1ecc4ad7d38bbdf110d582c4baf
cal-times-or-on = 次，或到
# en: 69bd4ef9fbd0894a22759c3766b859defbdedbc8
cal-view = 视图
# en: 97211a8888128314d9ca34d1005f08cb83ed5d9c
cal-what = 事项
# en: 879e32326c5217968ac8e3a14e4a8a5214957264
cal-year = 年
# en: 6189fbfe149a418e2f6d1af4dd71b04f6aa0c50e
cal-color-stands-for = { $color }代表
# en: 63e5df0eb2fcd351c1d31f23cdf3bf4816e3def5
cal-every-until-date = { $every }，直到{ $date }
# en: 519c383aaa892cfff62e992bb947ec79ed5dd57d
cal-every-n-times = { $every }，共 { $n } 次
# en: d69842d42eceddee8c62019d22d4f7ca383cf847
cal-n-days = { $n ->
       *[other] { $n } 天
    }
# en: 0cf851711322b556de4e3e932cdf083d7444c723
cal-n-done = 已完成 { $n }%
# The templates: each name, then its line on the home page.
# en: 71428a822d08efae1d13babd6073592abec99d1f
cal-bakerys-posts-and-newsletters-through = 面包店整个冬天的帖子和通讯，每天一个降临节故事。
# en: 91dad831b9be334af672cd6052e37dedde16d06e
cal-youth-soccer-season-practice-every = 一个青少年足球赛季：每周训练，主客场穿各自的队服，还有季后赛。
# en: d7bad656f3b06c3ee989a1f2960214ee15b2f788
cal-small-teams-time-off-public = 一个小团队的休假、公共假日和圣诞停工，都在一个日历上。
# en: cd6036648af6d0d5614f0ec65eb732300281e059
cal-community-garden-plots-year-when = 社区菜园里一块地的一年：何时播种、栽种、收获和修剪，年年轮回。
# en: 1b04e3c7d585a3d6297852d158919c9833538a01
cal-fall-term-from-first-day = 秋季学期从第一天到圣诞：停课、社团、郊游、家长会。
# en: f80b28faa22109c4d14cf7eb7994768abca09ca8
cal-bills-and-renewals = 账单与续费
# en: 2223281ed9222907f9d00ef35ab71df263d06e46
cal-conference-agenda = 会议议程
# en: 87695adec8581b20111f35794592bb162c32e800
cal-content-schedule = 内容排期
# en: 072b8e4f3e23cdd58cf0a4b3f5c47437127f131b
cal-editorial-calendar = 编辑日历
# en: 26f861d8db0e97575e814ce9799eaf1bcddec28b
cal-every-autopay-on-its-day = 每笔自动扣款在每月的哪一天，年度续费和报税截止日。
# en: 2185215436152ae5c1d9429385551e46587c7af8
cal-garden-calendar = 花园日历
# en: 624b49bb82a8487f3ff77d2098b88b1e1ceb6695
cal-vacation-planner = 假期规划
# en: 1ceb786961989ab69eda934e08645ecb19fe5357
cal-league-schedule = 联赛赛程
# en: 5a94fcfb3e67abfdd4e3bab4c3d9a2683801245a
cal-school-term = 学期
# en: 2f88af7308e60cbfbe5482a13acec0983b020e09
cal-training-plan = 训练计划
# en: 5ef83b6b17b42f15d49c31f33e46ca8d4427e6ae
cal-twelve-weeks-to-half-marathon = 十二周备战半程马拉松的日程：打基础、加量、冲刺、减量、比赛。
# en: fdab2603fde2488e117cca6335baee3c481231b9
cal-two-days-of-talks-and = 两天的演讲和工作坊，按小时排，每个会议室一种颜色。
# en: c8bbdc31a9be182914dd6207c08837389224b33a
cal-two-issues-of-quarterly-from = 一份季刊的两期，从稿件到发售，另有月会和发布。
# en: 0e4753002a6b042b841f5296f0cdb7c71110377b
cal-volunteer-schedule = 志愿者轮班表
# en: f6003458ea2ce51dfa0efa7d0819ccb57ac35bd1
cal-who-does-which-shift-color = 谁值哪个班，每人一种颜色，在圣诞前的食物银行。

## the Diagram Maker

# en: 8737093597f4fbcf30fb6cb5d44b96f338f143c1
diagram-diagram = 图示
# One app, eight kinds (mind map, org chart…); a 'thing' is whatever the kind is made of: an idea, a person, a step.
# en: a6c5e06888a8fcbcb520ea2a9952009715b62e25
diagram-mind-maps-org-charts-family = 思维导图、组织架构图、家谱、泳道图、时间线、韦恩图、座位表和网络图，几行字就能画出来。
# en: 5c943d9da9c2dfa4508b7318865477cb55850904
diagram-empty-diagram = 空白图示
# The kinds, one of each kind's things (Insert's item), and how a line of each is written
# en: fcb9bd322ef2e2b0e304d49bdafd2842995a47e6
diagram-mind-map = 思维导图
# en: 2cd7504a5a56c5729f37aca4d0234b698e0c0afe
diagram-org-chart = 组织架构图
# en: f78fddbccd57da0c8456fd39da6c21cdc0371020
diagram-family-tree = 家谱
# en: 5a79fb6ed9e87efcbde2485d08845fe16296c303
diagram-swimlanes = 泳道图
# en: 018514a3d58aa08353dd5e387ee29de45981c409
diagram-timeline = 时间线
# en: e5c282f3e15ca1cf6a0b7837f7c7cd8b2bc12783
diagram-venn = 韦恩图
# en: 840cfb1a1746bbb150371dbcf3ed341983a80c11
diagram-seating-chart = 座位表
# en: 53ebc572b4a44802ba114729f07bdaaf5409a9d7
diagram-network = 网络图
# en: bd69a4732fe12702d5ff5838852eb29e4a9e2e02
diagram-idea = 想法
# en: 8c41ae88467fe5bbad09fcd488662b25c3ec5333
diagram-person = 人物
# en: dc416e1088e4bf094dfc9abe0210e0288f5a169e
diagram-step = 步骤
# en: 448ab73ba1c21e671e218fb91f2644c834f0c16f
diagram-set = 集合
# en: ecdda59aea5ee67d7d854c969ccf7f4f4b4a4c54
diagram-thing = 项目
# The picture, and the line editor over a thing
# en: c2e45b49b02d2ac7e1baf25d9d0a2f5c257281ad
diagram-tap-empty-space-for-thing = 点按空白处即可添加项目。要连接两个项目，按“连线”后点按两者，或把一个拖到另一个上。
# en: d4b16450c157188d2cf2e3968faee3709ebeca28
diagram-tap-here-to-add-first = 点这里添加第一个{ $thing }。
# en: 37373f1290537ea3cee3be3f99534ec4acfd391f
diagram-tap-in-lane-to-add = 在泳道中点按即可添加步骤。点按步骤即可编辑，拖动它可移到另一条泳道或位置。
# en: 639d02ad26e5be80f5baf69835b953dfc015178b
diagram-tap-thing-to-join-name = 点按要与 { $name } 连接的项目。点按空白处可取消。
# en: 5d36f27a0649ac9ae67fb2e66f5be89ebc4719c8
diagram-tap-first-thing-to-join = 先点按第一个项目，再点按另一个。点按空白处可取消。
# en: 8953058d46b225514231aca0b8643f4e72547676
diagram-this-thing = 这个项目
# en: 53ea183a6bb5ad2942edd6884230b8f425c0eea6
diagram-add-under-it = 在下面添加
# en: e9e7205b6f0bd7d9c8f1a1dfe85ef9d54979662f
diagram-add-one-more = 再添加一个
# en: be34070c33b5c14155fe70a18891828387dd399d
diagram-add-after-it = 在后面添加
# en: 5df0e8be499c468b0dab69bb2c4ca50b7721b5e6
diagram-add-branch = 添加分支
# en: ea5c1a20b7cfcfec8a35fb4c6a419a1314233755
diagram-shape = 形状
# en: f0b053e1c812d5a809f3ff9c206287cc97c84877
diagram-shape-usual = 默认形状
# en: 90d24ab49426f19e75a2b6c3fd9196603c2e0852
diagram-add-step = 添加步骤
# en: e0d73143de80d17e82de2e017ac156ca3b9c4e01
diagram-join = 连线
# en: e45795fb6033ae4ecc1e2e3610273fce71a317d7
diagram-make-it-plain-line = 普通线条
# en: 3a4758c3cc8dac2d76026d0733816741f9b21d43
diagram-make-it-arrow = 箭头
# en: a07496767ed7e5caf20bb803434a1aa088aaa97b
diagram-what-connection-says = 连接标签
# en: 7d531617dd394cef59d3cf58fc32b3bc458f6744
diagram-who = 谁
# en: b48a4ad455ccc1431a4d3304864d95fb5de61df2
diagram-connection = 一条连接
# en: ad87109bfff0765f4dd8cf4943b04d16a4070fea
diagram-empty = 空
# The templates
# en: 8b0bc4ee7e0e6e592c5e8812fef8883b9cbc66de
diagram-empty-kind-to-start-from = 一个空白的{ $kind }，从这里开始。
# en: cc9cfe196eaec8bbe041a0f648039cf31df71bc7
diagram-browser-api-database-cache-and = 浏览器、API、数据库、缓存和后台任务，以及它们之间如何通信。
# en: 87796704431b42da8083f869f5ed707dae8cf8fe
diagram-building-project = 一个建筑项目
# en: 5accd00ffa799aafee66a6e2e7a77c3e89abdd38
diagram-launch-and-everything-that-branches = 一次发布及由它延伸出的一切：产品、营销、支持。
# en: 9261260de34a3ec89f2846b1c6a53b8adc25bb35
diagram-package-through-store-warehouse-and = 一个包裹经过商店、仓库和快递公司，中间有一个判断。
# en: 0ef1081dd660cc404f38216048590ca0999c05d2
diagram-small-company = 一家小公司
# en: 6dea73ecffb81e3db543a664a3ba6e602d58683b
diagram-wedding-dinner = 婚宴
# en: 1086ae322f0484af87b4a35b9537b35ad53ec68b
diagram-year-of-dates-from-plans = 一年的日期，从方案获批到开门营业。
# en: c75834baf2bd8482dbb5a822f4466908244e65fa
diagram-cats-and-dogs = 猫和狗
# en: 9e4600a93df1d0ffd290278244beed2111ac5cff
diagram-computing-briefly = 计算机简史
# en: 4944a571da52f0920a54f002e637dfc6e179603f
diagram-fast-cheap-good = 快、便宜、好
# en: 77373004b00a68bf2cad476daa1ef0af2a7e26f0
diagram-four-tables-and-who-sits = 四张桌子，以及每张桌子旁坐着谁。
# en: 1db47899ccb6eda1f1c46cee3c73acb1394c00ca
diagram-from-lovelace-to-now-spaced = 从洛芙莱斯到今天，按年份的实际间隔排布，底部标出时代。
# en: c973a2e43350a1c09697af1bd39a17f3cfba2c36
diagram-from-order-to-doorstep = 从下单到送到家门口
# en: 91519d37fd9fe6f0c40b0429e0ed9f8eb8206006
diagram-from-job-description-to-yes = 从职位描述到一声“好”，一条泳道一条泳道地走。
# en: bfd1a142e965498fd2dbaa45ca87c1cbdc9071c9
diagram-grandparents-their-children-and-grandchildren = 祖父母、他们的子女和孙辈，附年份。
# en: 347a51bd3c26ccac83baeca51966f318d5bb06c4
diagram-hiring-someone = 招一个人
# en: f30d75896062b87258051feec53d9f7c05059037
diagram-how-app-hangs-together = 一个应用的构成
# en: 70a97689961708e74a02157e6675bbcab893b7a4
diagram-seven-people-who-reports-to = 七个人，谁向谁汇报，以及一条虚线。
# en: 45ccf051d72194e5207999d9eeabaf9311e07ec2
diagram-garden-this-year = 今年的花园
# en: 3fa0b6c790e0b44a046fe73aa9cf77f99106074d
diagram-three-generations = 三代人
# en: 206f4033c4733b2b04a85ee0de9d35b1a5acc692
diagram-three-sets-and-every-overlap = 三个集合和每处重叠，写明什么属于哪里。
# en: 762ecdafab9b2868da1121459828ec245b03ac5e
diagram-two-sets-and-what-they = 两个集合，以及它们的共同点。
# en: f02e532d172e25cb200306e2edda8e4331418dcd
diagram-what-to-grow-and-jobs = 种什么、做什么，画成思维导图。
# en: a6847567865dbe1e5266bbcd7f1f4e0049ee9eb1
diagram-biology-final-in-december-topic = 十二月的生物期末考，一个主题一个主题地复习，以及怎样把复习做完。
# en: e32c422ee266430ea9dd0cd2cc78750a1342302a
diagram-classroom = 一间教室
# en: e491ee6c30111d9c51d83d4a19aba47a3c39c769
diagram-family-with-godmother = 有一位教母的家庭
# en: c164cf0f878062c2b43b69bf4c1de2c3d6a1f94d
diagram-principal-her-assistant-principals-classroom = 一位校长、她的几位副校长、各班教师和校工。
# en: f25d2f240d3a52d5361d9b6dd4d8561290566159
diagram-move-to-lisbon-by-march = 三月前搬到里斯本：证件、住处、工作和生活，以及什么必须先办。
# en: d2586903dd907f55b8076edbe00b87f4e45ab92f
diagram-elementary-school = 一所小学
# en: 3eff234615aa3d538d44f11142e266d62b44ef43
diagram-restaurant-kitchen = 一间餐厅厨房
# en: 3fecd5a70de57bb7748a775d7d4c6072bace1e50
diagram-router-and-everything-on-it = 一台路由器和上面的一切：笔记本、手机、打印机、电视和门铃。
# en: 949c596fb3177561b6f2515cbc92b6b68a4292c2
diagram-team-by-its-skills-design = 按技能划分的团队：设计、写作和代码，以及谁身兼数职。
# en: eeb20483d989d9deef42a5ae150f171af0bc6201
diagram-expense-report = 一份报销申请
# en: ded9774849cab88a3dd08936595ffe270dd397a2
diagram-apollo-11 = 阿波罗 11 号
# en: b5723994f111884ca2f9a82ecb525fb6992e44c8
diagram-board-game-night = 桌游之夜
# en: d69e423520fc900afc06f3d31ab286694fb7d67b
diagram-class-4b-at-four-tables = 4B 班按颜色分坐四张桌子，外加阅读角。
# en: d8d0862686b742040e32f8f3235084ad61fcef28
diagram-eight-days-in-july-1969 = 1969 年 7 月的八天，逐日记录，从发射到溅落。
# en: ce31ba59543ea424a6019bc67976ace141d62d09
diagram-four-games-table-each-and = 四种游戏，每种一张桌子，以及谁在玩什么。
# en: 9d35a9836a6bb4c6180f6c2880c8c19c22ed4ea0
diagram-from-photo-of-receipt-to = 从收据照片到工资单，经过经理和财务。
# en: 1f1489585228c4bf2d9599bdff9fef70f59b4a60
diagram-moving-abroad = 移居国外
# en: a04755781fd967ec44d2f47f1ebf6ff83b2fe909
diagram-patrick-and-maria-their-six = 帕特里克和玛丽亚，他们的六个孩子及其生卒年份，以及抚养孩子们的姑姑。
# en: 56aa5ec3b6a5e62a57ce1e1223c5f1f8148a7e02
diagram-studying-for-exam = 备考复习
# en: d7cda8e6bd3d07fe1968c61d6b068203911ae45c
diagram-sea-clouds-mountains-rivers-groundwater = 海洋、云、山、河、地下水和植物，以及水在它们之间如何流动。
# en: a1da7a04adf4a0189219b39bddb2518c44ba382f
diagram-brontes = 勃朗特一家
# en: 0c2311a818005e4508a11aa6a888f61a45bd9a3b
diagram-brigade-under-head-chef-front = 主厨领导的厨房团队，旁边是前厅。
# en: 0c62114de8628cfe00011bba9cc35f003279ac83
diagram-house-network = 家庭网络
# en: 1fcf7cc436a073faa316df56cf1a4d3ec2b87d6e
diagram-water-cycle = 水循环
# en: cdb628c70ae8584f4098828ec8a65f19d44697b8
diagram-three-generations-of-morenos-and = 莫雷诺家的三代人，以及通向一位教子的虚线。
# en: 0e60bdf5cc3dbaa6c2018bd31c760c1e46e79ab1
diagram-who-can-do-what = 谁能做什么
# en: b27a04f87f9d4657107a8dbd89d32eb1dedb41b7
diagram-tap-empty-space-for-branch = 点按空白处即可添加分支。点按想法即可编辑，按 Enter 到下一个。把一个拖到另一个上即可放到它下面。用“连线”可连接导图上不相邻的两个想法。
# en: fd23500d007e121f9530bb8b530f367ed9e00825
diagram-place-cards = 座位卡
# en: dd9ef7db14a8bdb18f7a266d6e91711443e71a29
diagram-print-place-cards = 打印座位卡
# en: 030e26916d4c1d1ca0c41b3b447dde54ed891dbd
diagram-print-place-cards-card-guest = 打印座位卡：每位宾客一张，每张 Letter 纸八张，可剪下
# en: face83ee3014bdc8f98203cc94e2e89222452e90
diagram-guest = 宾客
# en: 5734dbf560e03e0dea1a1bd85af5088238d5d0e4
diagram-new-idea = 新想法
# en: 32c6bde8aa4d539c3b773b1f4cf66e15aa427faa
diagram-tap-empty-space-for-person = 点按空白处即可添加人员。点按某人即可编辑，Shift+Enter 写职位，Enter 到下一个。把一个人拖到另一个人上即可放到其下。
# en: 5f7463cc9e2e8a2e25990127091710a286d9765a
diagram-tap-empty-space-for-event = 点按空白处即可添加事件。输入日期，按 Shift+Enter，再写发生了什么。日期按比例排开，时间段显示为色带。
# en: b6395077670d276b6a207a6eadb6f5a17c1fa854
diagram-lanes-name = 泳道名称
# en: 769bb19e615b7f8e2809e5882e2d05a18f57a531
diagram-when = 时间
# en: b23ea75ecf303b9756682c84abecebc7a010f2b1
diagram-tap-person-to-type-on = 点按某人即可编辑。用 + 加名字添加伴侣，Shift+Enter 写年份，Enter 到下一个。把一个人拖到另一个人上即可放到其下。“连线”会画一条虚线。
# en: 14e56ce6d5f3d8d56d2ce979bf2eb20aaa9dd93d
diagram-tap-empty-space-for-table = 点按空白处即可添加桌子。点按桌子或人即可编辑。逗号开始下一位客人。把人拖到另一张桌子。
# en: 7049f105f3a76be9cb8c6d7b74eb3edf60d9a7da
diagram-tap-inside-circles-to-add = 在圆圈内点按即可添加项目。逗号开始下一项。点按集合的名称即可重命名。可把项目在圆圈之间拖动。

## the Trip Planner

# en: fdd91fbac0e5654a70026a229cc8a5d869157b24
trip-trip = 行程
# A stop is a place on the route; { $n } is its number, { $time } a drive such as "1 hr 38 min". 'Trip Planner' and 'Plan' are above.
# en: 46644fef83a4f92870b2bda5079d97dae8b05b1f
trip-route-on-map-stops-in = 地图上的路线：按顺序的各个站点，每站一条备注，以及站与站之间的距离。
# en: 199cd6e4be673dbec0dfaaa645071e949f5480cc
trip-gpx-route = GPX 路线
# same
# en: 97eeda258d4d0c87a81a7741038e625eda23a2a6
trip-geojson = GeoJSON
# The bar and the map
# en: 63746c80a9900aa0b9df832d6fe50b7318a88aab
trip-a-place-by-name = 按名称找地点…
# en: c86d6e7640906afe6a57236c004f0b1af53b6ee8
trip-stop-at-middle-of-map = 在地图中心添加站点
# en: a52fccf0e1e5beca9d5885f1638d5e9a6a2684f9
trip-measure-in = 计量方式
# en: 2458f1444290ced8aefad04d5c947b17bf9a81fb
trip-hours-of-driving = 驾车时长
# en: 5fa6c4032be31076212eb57f2fe6ba44d445d501
trip-miles = 英里
# en: 87bafdbb82c61625882d74515ef2c7e566177ea5
trip-kilometers = 公里
# en: 8e49f86b47ba8e4ac259af7b5428623e7332489c
trip-join-stops-in-order = 按顺序连接站点
# en: 7bdcf970899e9519b75f2dc24d1909f670b283cb
trip-show-whole-route = 显示完整路线
# en: fa157c9ab413b3c415d7ada7457694a35c7869a1
trip-where-i-am = 我的位置
# en: ab478f3efc840eebab919dff1b9512286f70c10c
trip-map = 地图
# en: 4fa4643900d7a129558f6c34b681a8d419a9ef9d
trip-map-tap-to-add-stop = 地图：点按添加站点
# en: a481372d94c5d404a0bd0a597cda747c83e952a4
trip-map-comes-from-openfreemap = 地图打开期间，地图图块从 OpenFreeMap 加载。
# en: dd1ac7c6150bf40973c618ac841d01f2281dea20
trip-your-location-is-asked-for = 你的位置只用于让地图居中，从不保存。
# en: 6c4827a34debc3c12e8a905f5e8025f0d22802cb
trip-n-stops = { $n ->
       *[other] { $n } 个站点
    }
# en: 44896c642dce2a144eb35fdb61cedb762cc44ca1
trip-stop-n = 第 { $n } 站
# A stop's number is its handle; the bar under stops chosen whole.
# en: 372c19ab2c53f7582cdbe3823523a8760d0f2807
trip-stop-n-tap-chooses-it = 第 { $n } 站：点按选择，拖动移动
# en: 56f844200d56e1fc382c81f28972a39aab61e019
trip-chosen-stops = 选中的站点
# en: 0e648419ea806b0cc4db81617f95870a094f3639
trip-stops = 站点
# en: a9d55cf1a8a7b85ab9e293fc1e40a440986b0725
trip-show-on-map = 在地图上显示
# en: bdea0edfea6bebf4baf952432856faf7b3f43890
trip-name-of-stop-n = 第 { $n } 站的名称
# en: 4dad38541848da253722328a5517dffdda35b4ab
trip-note-for-stop-n = 第 { $n } 站的备注
# en: 0a8abf5522e2f20b1f976982533aabd909645324
trip-about-time-by-car = 驾车约 { $time }
# en: 7f85e32db6c77473c8b172d1ad1dab75462705a3
trip-tap-map-to-add-first = 点按地图添加第一个站点，或按名称插入一个地点。
# en: 472fd6a8979384a06de401f16cafb9cfdd9a824c
trip-insert-place-by-name = 按名称插入一个地点。
# Finding a place by name
# en: b75a19207f834200f4801a2db37886567baf25bc
trip-place-by-name = 按名称找地点
# en: 7d7388a1d59910888c95c66fed24ad82cb5edbf2
trip-find-place = 查找地点
# en: 57d3470391ec96a8442196a4ff85cf39e4f65e98
trip-town-address-museum = 城镇、地址、博物馆
# en: bce06414177f72ab70e6387b6af9f8ceef0d6049
trip-search = 搜索
# en: 1a6a5ba8c23ddb672874a2996abaee1fe933abcd
trip-searching = 搜索中…
# en: 07a4d61733e108a8ffa6e5753e09227b6a1a0f80
trip-searching-sends-words-you-type = 搜索只会把你输入的内容发送给 OpenStreetMap 的 Nominatim。
# en: 2b36ec5f26fb5c35fccb5edd05776349d238b677
trip-places-found = 找到的地点
# en: 6c70807e19d1f88aae7d66770719debbaf4ae89b
trip-nothing-found = 什么也没找到。
# The templates
# en: ce482808305f25f4c7f63905061b0c411444f12c
trip-week-in-portugal = 葡萄牙一周
# en: 3a4002be5f16560bb462d3f37d8b2caac8a65603
trip-lisbon-to-porto-by-car = 驾车从里斯本到波尔图，单位公里，每站一条小贴士。
# en: 72fa00e64f1816bfe62cd5e5ebae7ddd8bbc1d59
trip-down-pacific-coast = 沿太平洋海岸而下
# en: 6d871c8c9ed845cfaaafff0c18e335ce6da9ba42
trip-san-francisco-to-los-angeles = 沿 1 号公路从旧金山到洛杉矶，单位英里。
# en: 8396776ccda695ac7d6e5f12a1eaa4dd3edecfac
trip-scottish-highlands = 苏格兰高地
# en: 7a3f06a64060636652afe5912e0a00016bc3d17f
trip-loop-from-edinburgh-each-leg = 从爱丁堡出发的环线，每段按驾车小时计。
# en: 9660e47a7aad398fbc88947cd22e8628b2a92115
trip-rome-places-to-see = 罗马，值得一看的地方
# en: f01c658cc1c5b1dbfba8045b885174d2f5a3d154
trip-places-as-dots-not-route = 地点只是点，不是路线：看什么、何时去。
# en: e50e4931f42687faef4a226f93981bb38a937ce9
trip-weekend-in-copenhagen = 哥本哈根周末游
# en: 402e0be1180f76470536e904cec4f7242211bb15
trip-friday-night-to-sundays-train = 从周五晚上到周日搭火车离开，步行游览，单位公里。
# en: a5594e90d42f49b6ce9e2842193b64f380d1a10c
trip-icelands-ring-road = 冰岛环岛公路
# en: b237aa87bc63dccebef93e19a8ef785d96ba69ce
trip-ten-days-around-island-by = 驾车环岛十天，每段按驾车小时计。
# en: 89059cee91b704cf1c0e42de4225df2968a207e7
trip-dublin-food-crawl = 都柏林美食漫步
# en: b934fa6dfc063b38e47ce12ed4622e1cc0d55b75
trip-seven-places-to-eat-in = 一个下午吃七个地方，自西向东，每两家之间步行不远。
# en: 2149c2c628bda1d9ea8522144f7ca59ce2a6bcc8
trip-yosemites-mist-trail-loop = 优胜美地薄雾步道环线
# en: 056b43a68d915001b02640fbb4ec910045a406ad
trip-two-waterfalls-on-day-hike = 从快乐岛出发往返的一日徒步，经过两道瀑布，单位英里。
# en: b1365d430388f423cf7142e4a78c7470fed8a5fc
trip-loire-by-bike = 骑行卢瓦尔河
# en: e0fc4a0bf8e42cf48f5f6825bc3b8420df625254
trip-orleans-to-saumur-in-six = 六天从奥尔良到索米尔，一座城堡接一座城堡，单位公里。
# en: e68d998a80765bfa302dd2b477f31c97db0d51d2
trip-college-tour = 大学参观之旅
# en: 02b9d4cf509b27e9011826d208a7831782bb08a6
trip-six-campuses-in-new-england = 一周内参观新英格兰的六个校园，每处都预约了导览。
# en: 651b0f889a962febf3a80370511cbc08abac73da
trip-japan-by-rail = 乘火车游日本
# en: f687060ca9b759a7ed4bca61f7a2bf96764f2f8e
trip-tokyo-to-miyajima-in-cherry = 樱花季里乘新干线，从东京到宫岛。
# en: afea6c128d27238aad4e11871dfff6f692334301
trip-last-100-km-of-camino = 朝圣之路最后 100 公里
# en: 33d01f381424bbc8bbd1b6a9487b3a53c38d07e9
trip-sarria-to-santiago-on-foot = 从萨里亚步行到圣地亚哥，一天一段。
# en: b15aca8406aa957e0b92331f3c94b96775672e6b
trip-new-york-in-movies = 电影里的纽约
# en: cdd506e6983757bd11c62cbbe6a0acbbd4002303
trip-seven-film-and-tv-locations = 七个电影和电视取景地，一天内从上城到下城。
# en: 2cf068b9c859d837fbc257f1dc20a64d0d96b2b0
trip-wedding-on-lake-como = 科莫湖的婚礼
# en: a3dec1f6e3f5856eb26a70a9c329744d499a1afc
trip-for-guests-where-wedding-is = 给宾客看的：婚礼在哪里、住哪里、怎么去。
# en: 0fbbb28a6e64acfee9300ecf05016dcf149a5a19
trip-presenting-trip = 放映行程
# en: 24848d1e92a4b831f8fdae547c2fbfdc0d1e441b
trip-presenting-next-stop = 下一站（放映）
# en: a802f6e93c981ee6dd02df366f0141ca3aa085e0
trip-presenting-stop-before = 上一站（放映）
# en: 3b14d20764a1fdef5ee74f4defab4ff20b0e7cce
trip-put-stops-on-calendar-day = 把各站点放到日历上，每天一站
# en: 16fa5ad4958332a6bbb1eae6d1a8c6ee6f2c7752
trip-first-last = 第一站或最后一站
# en: 0aa341109cff3c75e204930fdeac94f52278bb67
trip-next-stop = 下一站
# en: 35bc0362a4899961a0e878990611c13021c1e549
trip-stop-before = 上一站

## shared: the Word Processor's looks, the header's Home, a money column's currency

# en: 958de540438a0fa530d47d2c072d0d9c22cd2af5
looks-typewriter = 打字机
# en: a5c78a86fab1c02cd981c23b8bad5dad3e7438e3
looks-serif = 衬线体
# en: 70f8bb9a8a5393ef080507a89e4b98d139000d65
common-home = 首页
# en: e070de224434a2acd352b35cec46f34f9e08e1b2
looks-currency = 货币

## the Calculator app

# en: a0015ec89d8034b2ca4a8f0219350514e19294a0
calc-calculation = 计算
# The tape is the list of lines worked out, as on a printing calculator. 'Calculator' and 'Numbers' are above.
# en: ab4ea6f8fe06812a128297560bee7aff1be0c040
calc-calculator-that-shows-its-work = 会保留运算过程的计算器：名称、单位和换算，以及 y = f(x) 的图像。
# en: f146f8e93fc9312f6b8003b048cd24d1574469af
calc-tape-text = 纸带（文本）
# The bar
# en: 9a7405ebcedde5be8d095a986ea8794e19ee84e2
calc-graph = 图像
# en: a3310f1f9bbb12cd753850392faec8453a10c709
calc-clear-tape = 清除纸带
# en: 14a09e767bb648a339ba82fb609c02f3d9aa4228
calc-clear-graph = 清除图像
# Insert: functions, and what the second engine reads
# en: 2b961dea1dc0c60ddf9a2c8e9d090f6f7d082483
calc-functions = 函数
# en: ca0c5d6d0a40f5f2e6f47ee8fc8b934a3eece03f
calc-sine = 正弦
# en: c1951ad44359d27f765c0f1c7bfea678577a3fb1
calc-cosine = 余弦
# en: 7ef1446b5f4ac08a82f28ef66bf019af3ed9c3c5
calc-tangent = 正切
# en: f90781f1beba7ea766ef6fddf4672221c99da01f
calc-natural-log = 自然对数
# en: c4607860d3bb073b2fe96de25c2566b33f6e5610
calc-log-base-ten = 以十为底的对数
# en: 47a3278f023594b94c900b5d792366be2e8b3d39
calc-square-root = 平方根
# en: 35e4a1a9ace5e53c1521b13130f3b1fce0bb312b
calc-absolute-value = 绝对值
# en: 8e4e872b30d442c4d7f1edf2cabdff971300b607
calc-factorial = 阶乘
# en: c584662e0778e58334ec2e9f7fc7f58a98d4dca8
calc-e-number = e，自然常数
# en: f3afae23c74a7d1a42a52c0c47bfeb1191b6b6e9
calc-x-for-graph = x，用于画图
# en: 1cfd7bfc7d3d79d7ea28a91bdc6e032559103831
calc-units-and-algebra = 单位与代数
# en: de1e4faaa9758db564ba458c3956824881efcd9c
calc-convert-to = 换算为
# en: 95562b515314072f0bc7658aa71f2ef77371d893
calc-derivative = 导数
# en: 965a00d9ba9665ad57ca3edefdcca07a61d3ca95
calc-simplify = 化简
# The tape, the line being typed, the keys; { $answer } is a result such as 42 or 7.62 cm
# en: c51c55b719457118a73f5732f4dd4772aaba2e20
calc-tape = 纸带
# en: 1acb1c0448ace57b632dc2d56121f45a18e646be
calc-line-n = 第 { $n } 行
# en: 43885eadc7bc789d89e6e81db680818d2dd1b223
calc-put-answer-in-line = 插入 { $answer }
# en: a9c16dd084ce3781568419133b0fa0c0f57aa727
calc-no-answer = 没有结果
# en: cf23123f857abeda1d28fc9b85cc7eba8d20f3b1
calc-take-away-line-n = 删除第 { $n } 行
# en: fc9ce14b28c6f2c3b72caf056ca604b2b96f7d2b
calc-sum = 求和
# en: fdb6ecce95257d64ccde93310bf9a9adc8ad249e
calc-type-or-tap = 输入或点按
# same
# en: e1745e3e21e84b24c379af6f45a18e1a21e56577
calc-y = y =
# same
# en: 97e60be18b1afcca3cde2fc6df4343208cefb0a1
calc-y-equals-ellipsis = y = …
# en: 71f2d6a97665cb72b50a6384a06af3e014b96db5
calc-at-x-1-answer = x = 1 时：{ $answer }
# en: e5651c683f14c95aa972cfdbc300d9fecfe02019
calc-keys = 按键
# en: 88d130a66de8e5db01660642d9f23e1f0eef97dd
calc-backspace = 退格
# en: d1149c36a0edcfbeae98bf270da3f543b6c6a866
calc-clear-line = 清空这一行
# en: 097a41c8c7e58b9b655d7b3e31a3673466595450
calc-answer-before = 上一个结果
# en: 2ee9e26d39d7113bd8fea80639d6257ab1bdf8cc
calc-type-sum-or-3-inch = 输入一个算式，或 3 inch to cm，然后按 Enter。a = 12 会用名字保存一个结果。
# en: 0bef86b24e006bd994db1509b268156522c7dc2c
calc-type-curve-in-x-such = 输入关于 x 的曲线，如 x^2 或 sin(x)，按 Enter 画出来。
# The templates
# en: bcb584ffecef3a17141a771a3ceedbbe6d474ca1
calc-splitting-bill = 分摊账单
# en: 0a45fc60c975ea141733f982179ead17af8767b6
calc-food-drinks-and-18-tip = 餐食、饮料和 18% 的小费，六人均摊，每一步都按名称保存。
# en: 2c9e678b58314997051ff2c13d56c92ea6bce7d7
calc-shopping-total = 购物合计
# en: d8719443b912bfaadd4f5d8fb2f1fc095f58ff52
calc-tape-of-market-apples-and = 市场的计算纸带：按重量买苹果和奶酪，合计，以及 60 美元找回的零钱。
# en: 56d12d641f4f4177e63e120c8bd10a8e7348357f
calc-tax-on-price = 算销售税
# en: 8a7d0a08d1e03c2974f84aa039e7871c5b232245
calc-new-york-city-sales-tax = 把纽约市的销售税加到价格上，再从收据里扣回来。
# en: 80296be8eee3142eb634c0045f82e15b5e5373aa
calc-percentage-change = 涨幅百分比
# en: 93650e756cc879e41310d678219f483e5ce2cfd1
calc-rent-up-from-1-450 = 房租从 $1,450 涨到 $1,595：涨了多少、百分之几，以及与加薪相比。
# en: 9ff9fc7e0344944578d50820e0326f7bf34f1c8e
calc-kitchen-conversions = 厨房换算
# en: c7ccdb52f144fcec56adb8ecb5264f35d03600c0
calc-cups-ovens-spoons-and-weights = 杯、烤箱温度、勺和重量，从一种计量换成另一种。
# en: 267b3d4696b05cc65039fcf4afb8cd9548ed5a29
calc-scaling-recipe = 调整食谱份量
# en: a0e9dcbc29ed1364a4891c3671dd43675af64d11
calc-banana-bread-for-eight-made = 八人份的香蕉面包做成十二人份：每种用量乘以一点五。
# en: 8639704eb84800c829b41e6fcd833d686dcb41f6
calc-unit-conversions = 单位换算
# en: 2aef2060ccb74d32576f5b1f936372bdd97252f3
calc-feet-to-centimeters-miles-to = 英尺换厘米、英里换公里、磅换千克、华氏度换摄氏度。
# en: 7b31203b4780df1cd410c84049ed4d031dacc8e3
calc-currency-at-rate-you-type = 按你输入的汇率换算货币
# en: 5f4e47693383fd619db1b39871b821a7fccf86df
calc-trip-priced-in-euros-and = 用欧元核算的一次旅行，换成美元，再加上刷卡手续费。
# en: 6645ae7e46c209b7ba6f5fb3b6aa707395a2c3d2
calc-fuel-for-trip = 旅行油费
# en: e2d3235c5cfd9ceffb4e54f0635e4f3841b0c0e1
calc-boston-to-montreal-and-back = 波士顿往返蒙特利尔：英里数、每加仑英里数、油价，四人分摊。
# en: bb294d581aa3512dfdaf06cb5705338f026425ff
calc-paint-for-room = 给房间刷漆
# en: 8899142eaeb03e3a2cfc17f5e68f1977478e2ce5
calc-walls-less-door-and-windows = 墙面减去门窗，刷两遍，用一加仑一桶的漆。
# en: fa9aac4028931969e4e43d5926f21c1c02b03737
calc-time-zones = 时区
# en: daa6b831387e404e18a932466e1b26486e942c1b
calc-one-call-at-9-in = 一场定在纽约上午 9 点的通话，以及伦敦、柏林、孟买、东京和悉尼那时是几点。
# en: 4126383a0888802d508caf9f1e9a973554c6eb7e
calc-running-pace = 跑步配速
# en: 73e59d9404aa7a32f2e7e9ae9ff609c2a74d14cb
calc-10k-in-52-30-minutes = 52:30 跑完 10 公里：每公里和每英里用时，以及按此配速的半程和全程马拉松。
# en: d1411ae3cdd27fda5ea57577c408be223f586cf0
calc-body-mass-index = 体重指数
# en: cf37a053ab6daf8527ff908a4479b6fb38654155
calc-weight-over-height-squared-in = 体重除以身高的平方，用千克和米，或磅和英寸。
# en: 18c8c5aa1c31cb796ef6aa8086b794bc59e4d454
calc-dose-by-weight = 按体重算剂量
# en: a2cdd7739e2ff2b4f1ee78074c5c7981d1b877f9
calc-milligrams-kilogram-turned-into-milliliters = 每千克多少毫克，换算成糖浆的毫升数；每个剂量都请药剂师核对。
# en: 4699da98e2d343e04aa2465082aedd4d5053aa11
calc-electricity-for-appliance = 电器用电
# en: d1b1126c73c13b523ce30bd2f563ad1a7b1c0210
calc-watts-hours-day-and-price = 瓦数、每天用几小时和每千瓦时的价格：一台取暖器每月花多少钱。
# en: 96aeea666f6bd696d83ef3dee80fff1fcc3ff896
calc-loan-payment = 贷款还款
# en: 9c2f158098b8fc30f79ae0d1db9391a68d8aea9a
calc-24-000-at-6-9 = $24,000，利率 6.9%，六十个月：月供和总利息。
# en: 3c48bd272b7ad823e277ca649218ae107832bca4
calc-compound-interest = 复利
# en: ce79ef1a5e051c360028ef440ccc8258554abe0a
calc-5-000-and-200-month = $5,000 起步，每月再存 $200，年利率 5%，十年，与投入的本金相比。
# en: 813161b07c2ed5cab82b09f8c31b3810800bcd26
calc-break-even = 盈亏平衡
# en: bee9b48a097d165fe0d11f7c3a7175019c158c5e
calc-costs-against-sales-for-coffee = 咖啡车的成本与收入：两条线相交处，就是每天需要卖出的杯数。
# en: a9047269b4f64dbbb2df8503315406b2b33fc4e9
calc-curve-and-its-slope = 曲线与斜率
# en: b5f43817a99082555a1fc4891fd2eb5bfaba6e10
calc-x3-3x-its-derivative-and = x³ − 3x、它的导数，以及低谷处水平的切线。
# en: d4802215f2c0025bd9e3f3fe025230ceda4e830b
calc-waves-adding-up = 波的叠加
# en: 9e46b2d75638fb2ebe905ad0c4be8059be6487cc
calc-sine-waves-summed-on-their = 正弦波相加，一步步逼近方波。
# The grip on a line of the tape; the bar under lines chosen whole.
# en: fd71cff4626f555a0e69c5b6801a591cabd1d173
calc-choose-line-n-drag-it = 选择第 { $n } 行，拖动即可移动
# en: dab2e3d9cf8c3bfccd20fa34fac6fc738ce9aba7
calc-chosen-lines = 选中的行

## two links compared (kit/ui/compare.ts)

# en: 8aa57de6dce6ee1c35c6aba7426503281876b258
compare-changes = 更改
# en: 8d105cf44d3926289e65c1c83d8e37cb23fd049e
compare-compare = 比较
# en: 24512a18bc6d2c27213ad28b26ce9271d94175af
compare-no-difference = 没有差别
# en: 8f0fb2d2ece91d9de4ed64f23a12b475c3e18970
compare-not-link-to-tiny-little = 不是小小办公室文档的链接
# en: e82be1221a13b593fd3fd58ffe24f3c3ba58f783
compare-paste-second-link-to-see = 粘贴第二个链接，查看改了什么。
# en: 442aef6fc360061295985657c4489b3c4d360cc3
compare-paste-link-to-document-as = 粘贴文档现在的链接
# en: 7fb07fcb91ba19442009f16f24be4ef85b3eca16
compare-paste-link-to-document-as-it-was = 粘贴文档之前的链接
# en: 0ae84aa126111ee639f685e9ed05c6895e632a90
compare-put-in = 新增：
# en: 210dd62a81e43d19e22018878ba665485e0526cb
compare-swap = 对调
# en: c331654dfaed937af3dc0e72f31b21fdfb1aa325
compare-taken-out = 删去：
# en: aec0a618ef67ca171ab77615fc7cab57405fea3f
compare-first-link = 第一个链接
# en: 123bc4a6d63cd1415119c84ed21412a29ef9fbcc
compare-second-link = 第二个链接
# en: 010030de6a30e85dd769e07201d8373ebff655c8
compare-two-links-to-documents-side = 两份文档的链接并排比较：第二份改动的地方会标出来。不会有任何内容离开此页。
# en: 2053662dff5d94e9ea30321321ce6cd0df8f0027
compare-different-apps = 不同的应用
# en: f4e4b3a1d739ce43635eb9d75d97403c420c0642
compare-n-blocks-taken-out = { $n ->
       *[other] 移除 { $n } 段
    }
# en: 0041ce2f8795b8fbc93244ba17b668d115906ef3
compare-n-put-in = { $n ->
       *[other] 新增 { $n } 段
    }

## files and zips dropped on the page (kit/file/open.ts)

# en: c99db7abba3f7227854d93a163ad3494de4e1571
open-opened-name = 已打开{ $name }
# en: f917dee4211bd4af58db8efec79e354e1ffb4912
open-that-file-is-not-words = 小小办公室无法读取这个文件。
# en: 1d08903947cc83b648f8ad96b1e23466a2dbed11
open-that-file-is-too-large = 这个文件太大了。
# en: 8f432852569edbf7610713a6554e7a61396327d5
open-keep-them-on-this-device = 保存到此设备
# en: c4fe6d8b035f6108e8a7e0037667dacf3d6cca25
open-nothing-is-saved-on-this = 此设备上没有保存任何内容。把它们保存在这里，或打开其中一份。
# en: 0826daee1d616f7de3a2b205eb2360fcaccc77ef
open-first = 打开第一份
# en: 59d36bf6c42ab3ae1481fe62abbc67ffef7a8b22
open-saving-in-this-browser-n = 正在此浏览器中保存：已保存 { $n ->
       *[other] { $n } 份文档
    }
# en: 4fc6621d5b53d413dd1fd42cf7e7834ee3ecba5a
open-that-zip-holds-no-documents = 这个 zip 中没有可读取的文档。
# en: ed5d2e1ab481efa92392820d83922b25c236c730
open-n-documents-kept = 已保存 { $n ->
       *[other] { $n } 份文档
    }

## a document's QR code (kit/draw/qr-picture.ts)

# Restored around the document: search, Find in this document, the shortcuts and the apps' keys, Mod+S, the size of
# everything, Add to home screen, another version kept here, where the link fits, Open in another app, the QR code
# of this document, Insert narrowed by typing, Trip presenting, a seating chart's place cards
# en: 775db36d459744f2dc73dcb147ab032f4b6f4a09
qr-code-of-this-document = 本文档的二维码

## the keys, the shortcuts and the size of everything (kit/core/keys.ts, kit/ui/zoom.ts)

# en: e5737972ceac5c184d5009e9ee1746c4b3292f26
keys-normal-size = 重置缩放
# en: 4fc05f2763ba31e2d3be5f08e7d0bab5d5dcbf78
keys-everything-larger = 放大
# en: a4ae4b24a1f5369c2bff61abdbc221170e4b27d8
keys-everything-smaller = 缩小
# en: 67312061f24800b7dc75b07101329959c5c1af88
keys-keep-this-document-on-device = 保存到此设备
# en: 4d5e11a737e63d755f4127a0139f235f3794b6c6
keys-show-these-shortcuts = 显示这些快捷键
# en: da05037a43419e15395f52f0ed4dcb0c7f75c1f2
keys-this-page = 此页面

## Find in this document (kit/ui/find.ts)

# en: 475c848673a3f79fa778f01c2bd5a721d4c41707
find-not-found = 未找到

## a menu narrowed by typing (kit/ui/menu.ts)

# en: a9c25fead588babdd6b90b343a47f716f722312e
menu-nothing-starts-q = 没有与“{ $q }”匹配的结果
# en: ddf17f8747a6b36489443d6b09c25b429a1ea675
menu-starting-q = 与“{ $q }”匹配的结果
