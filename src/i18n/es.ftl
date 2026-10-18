### Los textos en español (neutro): cada cadena que una persona ve, con el identificador a la izquierda del «=»
### y las palabras en español a la derecha. Los identificadores, las { $variables } y los grupos siguen a en.ftl;
### en un plural el español tiene tres formas: one (una), many (millones), other (otras).

## the shell: header

# en: 57f5f5efbc5990f5230aa95359042338b856707b
shell-menu = Menú
# en: 768e0c1c69573fb588f61f1308a015c11468e05f
common-title = Título
# A new document of the app, and one not yet named; { $noun } is the app's noun: "New presentation".
# en: ef9b1a33245907a9a1d7b7c22053168ed660d014
common-new-noun = Crear { $noun }
# en: bd2ce96ba3cfd14a4c62847d4e6bb0b8a3c72d25
common-untitled-noun = { $noun } sin título
# en: a479c9c34e878d07b4d67a73a48f432ad7dc53c8
shell-download = Descargar
# en: 33ce417454bfd838897deaeee2355e818a5d4160
shell-loading = Cargando…
# en: 22456f903bcbdedb06221ade9b87febb47722e40
shell-this-link-holds-something-that = No se puede leer este enlace. Quizá se cortó al copiarlo.
# en: 7dfd19fef00f41e899fb6e2753b71ae40ba59e6d
shell-n-of-max-link-characters = Quedan { $n } de { $max } caracteres del enlace
# en: 51a6857d24b72bee0d1e541448d0f9c8fd5b8697
shell-n-characters-over-link-limit = { $n ->
        [one] Hay { $n } carácter de más en el enlace
        [many] Hay { $n } de caracteres de más en el enlace
       *[other] Hay { $n } caracteres de más en el enlace
    }
# en: 1cfbe154225ecb3a01f463f1adde07279f1a454a
shell-n-characters-over-link-limit-short-link-holds-max = Hay { $n } caracteres de más en el enlace; un enlace corto admite { $max }
# en: e7722b7943884e579644a3f5bd2b605afd08a156
shell-n-characters-over-what-short = { $n } caracteres más de los que admite un enlace corto
# Before a document that lives nowhere but its link (Private, changed) is left for another place: the question and its three answers.
# en: f0bba930d38a38cacb48e472c8d4856caa4d8fa8
shell-this-document-lives-in-its = Este documento no está guardado
# en: 43454bfced276b8a1b83dea8a0bef1794a9bde60
shell-nothing-is-saved-on-this = Solo existe en su enlace. Copia el enlace para conservarlo o guárdalo en este navegador. Atrás también te devuelve a él.
# en: e0ef0b02c240e569b52e799771dbb4fb07b35818
shell-copy-link-and-go = Copiar enlace y salir
# en: fdb4eeef33355eb9aed9f11d6ddcdfe0c08a29ea
shell-turn-on-save-in-browser = Guardar en el navegador y salir
# en: 634bae7c8177155bc24961f3493f425b66e88c16
shell-go-without = Salir sin guardar
# en: ee7a39c93b7018b92bcff5511a92081df68dd3db
shell-save-in-browser-is-on = Guardar en el navegador está activado. Los documentos que abres se guardan aquí. Desactívalo en el menú.
# en: 97c669558589e3b0cf0917cb9caece8844ba65d9
shell-another-version = Otra versión guardada
# en: 87222e82bf5d208052c68fa66c93d131fa18fc67
shell-kept-on-this-device = Guardado en este dispositivo
# en: 266695479a949eec44dea9db4e15fba00163f04e
shell-keyboard-shortcuts = Atajos de teclado
# en: bc447a3151935ceff76e781c90fb02c45d25f004
shell-nothing-to-keep-yet = Aún no hay nada que guardar
# en: 8c00f9130260156b1612126a7cf9a23bb3c553d6
shell-open-it = Abrirlo
# en: ef6e207cc7cea57220ad9a73fc6040b0085bf63e
shell-save-in-browser-is-off = Guardar en el navegador está desactivado, así que no se guarda nada. Actívalo en el menú.
# en: 3939d97295147954c5488340b1f427ebbfa51e69
shell-skip-to-apps = Saltar a las apps
# en: 286b3810e407b3cef40b582c8ca4b373a58445bf
shell-skip-to-document = Saltar al documento
# en: 03d9aea1885137ab8ab4d9c24250515cb44161f0
shell-this-device-keeps-another-version = Hay otra versión de «{ $title }» ({ $when }) guardada en este dispositivo.
# en: 25c53c58cba7054a3a2ae9e9b575c7888716ae94
shell-this-link-was-made-by = Este enlace necesita una versión más reciente. Recarga la página.

## the home page

# en: 276c9361fff15e60f48af4d733ec83315d2bb251
home-blank = En blanco
# en: f25b700ed9f092123a43acb205a6869342cf9dd6
common-templates = Plantillas
# The button under an app's tile, naming the template list: "Start Text from"
# The list of an app's documents kept on this device, under its tile: "Write documents"
# en: c647789831582ba7f4b6aad72ea6f425b98aad6f
home-app-documents = { $app }: documentos
# en: f6fdbe48dc54dd86f63097a03bd24094dedd713a
common-forget = Eliminar
# The button that forgets one kept document: "Forget Launch notes"
# en: bbc98cac8e5e1a213d5aa04b3618196a6d28bf49
home-forget-title = Eliminar { $title }
# Under an app's documents, the rest folded away: "3 more"
# en: 84ab0eecfadb6332ee8b1ee5c67852b7df54e66f
home-n-more = { $n } más
# en: 7f2352058be05faa9a191d7ac6eb2cf0a15b228f
home-aboard-project-made-with-respect = Un proyecto de { $aboard }. Hecho con respeto en Nueva York.
# en: a26ce4e876668bb8cdbd6db05cc668d436b73ba6
home-beta-version = Versión beta
# en: 84add5b2952787581cb9a8851eef63d1ec75d22b
home-email = Correo
# en: 5b5d9a510b8eb3d8ca42591036a5fb8c0402a674
home-templates-for-app = Plantillas para { $app }
# en: 5c88e1ec022720d6a2199c408f861dd61bfdbb08
home-app-templates = Plantillas para { $app }
# en: 5ea1c79be74b3d7c077d35212d473ca6fbd80c4a
home-templates-for-app-name = Plantillas para { $app }: { $name }
# en: 9b96d854dd8e79adb3ee6e1e0e419b50fc1aed43
home-templates-are-not-saved-in = Las plantillas aún no están guardadas en este navegador. Conéctate a internet para verlas.
# en: 25d37d0580af5bc389b9332f3640f6d73ef93e48
home-documents-found = Documentos encontrados
# en: 5e46670f6fe68987a7e5c94f03e192aff635df77
home-no-document-here-has-those = Ningún documento coincide
# en: 1dfc2a61eb2345a48a2a91b7922b83f580553732
home-search-your-documents = Buscar en tus documentos
# en: 4f5fbd7fb6a16b16ebe3c347bf43c9a2455a1560
home-n-documents-found = { $n ->
        [one] Un documento encontrado
        [many] { $n } de documentos encontrados
       *[other] { $n } documentos encontrados
    }

## the drawer (hamburger menu)

# same
# en: d9a36850b7f3f78365a998cb16cb68b6fd79400d
drawer-apps = Apps
# en: bbfa773e5a63a5ea58c9b6207e608ca0120e592a
common-close = Cerrar
# en: d6cbbf296e77dd589e704c39eb4d6575d31a1d22
drawer-default-name = Predeterminado: { $name }
# en: 1660227e6037ceaaaacebea7ba86a1f92071bd39
drawer-save-in-browser = Guardar en el navegador
# en: dd8082be77e9211f033a55131c1a6360f12b0e1d
drawer-what-is-this = ¿Qué es esto?
# en: fa7684f5e02290b9144d9d981add78ff873eb052
drawer-turn-on-to-save-files = Actívalo para guardar archivos en tu navegador.
# en: af191ab94c0b2f93d5e90820805b9c7f419ce80d
drawer-turn-off-to-remove-all = Desactívalo para quitar todos los archivos y ajustes.
# en: db5f691e51583d80782a9c51e78f01c49ccefd02
common-nothing-saved-in-this-browser = No se guarda nada en este navegador
# en: 15f47f2fab9454be9fab70ba4bd89293fdc40c0a
common-saving-in-this-browser = Guardando en este navegador
# en: 5e543c55dd0832d9cbbdccc9e22011d240080e50
drawer-remove-all-files-and-settings = ¿Quitar todos los archivos y ajustes de este navegador?
# en: 89b86ab0e66f527166d98df92ddbcf5416ed58f6
drawer-language = Idioma
# en: a797e30923ac1be590300ce6b08e63b4e6dc6688
common-theme = Tema
# en: 15360c25a66578ad69e81e4c2fc3f0001e8a2258
drawer-match-device = Como el dispositivo
# en: a36ef8aba22905e2d2efbf1ac1d6230d5761859d
drawer-light = Claro
# en: ae1ef01432946b8976b9b58575b3390ab7644db2
drawer-dark = Oscuro
# en: 6b21fb791ac05170893860c248401cd24a59b732
drawer-about = Acerca de
# en: 515e0d24040d094379cfdc94e3c6c2f63a26f1f6
common-tiny-little-office = Oficinita Diminuta
# en: 399d4aacd52f76ac8090ce08a31e550e2123645d
drawer-about-tiny-little-office = Acerca de Oficinita Diminuta
# en: 6218d1c0ab69084ed45fb0f022b95f382310184a
drawer-tiny-little-office-is-experiment = Oficinita Diminuta es un experimento de { $aboard }, una empresa de estrategia digital y de IA y de desarrollo de software en Nueva York.
# en: 04a1291dcc6e5d304f04516685710a331963f630
drawer-to-reach-out-with-questions = Si tienes preguntas, { $email }.
# en: 522edc71559293b5713cff3f13c2dbafd37a56a3
drawer-email-us = escríbenos
# en: 98187f1688112fa57c00a326f526288fa3e6b023
drawer-if-you-find-bugs-please = Si encuentras errores, repórtalos en nuestro { $github }.
# en: c6651994b242228b647fbbd2a83eccefd957abca
drawer-github-repository = repositorio de GitHub
# en: 0fe421942f09b119f9019d2de286f5a43eefd4f3
drawer-all-of-these-notes-these = Todas estas notas, estos dibujos y estas frases escritas con rotulador se borran con el tiempo. Solo lo efímero perdura.
# same
# en: 45efc495ed63ce777a86a3f8a9f4475269fb7542
drawer-eugene-ionesco-book = Eugène Ionesco, { $book }
# en: be1c21d6fe0ae49ef2cea2d317a4967da26d015c
drawer-discoveries = Descubrimientos
# en: 687c82861c956e47456186f6522cfc8dbadb8ef6
drawer-documents = Documentos
# en: a5c79e56eede8d4e922d461872629a01dd41ab77
drawer-find-app-template-or-command = Buscar app, plantilla o comando
# en: 45e5f3f72e961cb70134ba35f7a27a9620e515f7
drawer-commands = Comandos
# en: b993b0c537190bfc94b21360ac5abe51e56be36f
drawer-nothing-by-that-name = Sin resultados
# en: 85773bc941e47b21f6cc345b225265e3144489be
drawer-add-to-home-screen = Añadir a la pantalla de inicio
# same
# en: 9b3cbed5c490c07473546a88768ba29b787e9e52
drawer-size-of-everything = Zoom
# en: 943c5ac9fa7766d7c1ebecbc95c4e0d27b4ef9d4
drawer-to-add-tiny-little-office = Para añadir Oficinita Diminuta a la pantalla de inicio: Compartir y luego Añadir a pantalla de inicio.

## links that leave the site (kit/ui/link-guard.ts)

# The menu button's tooltip: the Office mark is the menu.
# en: 4a48e81d0d023913c2155eb30954f58853a5591d
leave-tiny-little-office-menu = Menú de Oficinita Diminuta
# The question before a link that leaves the site: "You are leaving Tiny Little Office for" over the site's name, large.
# en: 92ad7c004fe14dea34666631ff31b016eb39ee40
leave-do-you-trust-this-link = ¿Confías en este enlace?
# en: 8d85feca3f164857fc84014a8f2ed5cc4846d4c9
leave-you-are-leaving-tiny-little = Vas a salir de Oficinita Diminuta hacia
# en: 50ef68d5c205237951dae42aa775a66480171c46
leave-this-link-writes-email-to = Este enlace escribe un correo a
# en: 102dce223fdc2f3bbdda71f28108e2a6fdf21710
leave-this-link-calls = Este enlace llama a
# en: afb8b3199e929e5e9f886fdf382599c9d440c71f
leave-not-secure-address-what-you = No es una dirección segura (HTTPS). Lo que envíes podría leerse por el camino.
# en: 003e4888e77a22c782047c7d26d028c5eca46f1c
leave-whole-address = La dirección completa:
# en: fdb31cf3fb383190c6864d4effd5fd6041b330cb
leave-someone-wrote-this-link-into = Este enlace lo añadió quien escribió el documento. El texto de un enlace puede no coincidir con su dirección. Continúa solo si confías en él.
# en: 2e0b45f2a456e8db55f08d7b65e87593a3e9a140
leave-go = Ir
# en: c0f31f8a18b087fc577cbc50e9d37c68cb16c9ae
leave-links-of-this-kind-do = Este tipo de enlace no se puede abrir aquí.
# About's last line, a link to the source of the build the site runs: "Running commit abc1234".
# en: 0eda2175601e6a4148c1c8b3f85c330bc7fbcabf
leave-running-commit-commit = Versión en uso: { $commit }
# en: 45469d1ce86c199fb2984929d6c2e408178f7032
leave-this-link-hides-characters-in = La dirección de este enlace contiene caracteres ocultos.

## the copy kept on the device (status lines under the switch)

## sharing: the Share dialog (kit/core/shell.ts), where the link fits (kit/share/limits.ts), the arrival banner

# en: 21697833514286cb120912c109ed55e870e44b01
share-copy-opened-in-new-tab = Se abrió una copia en una pestaña nueva
# en: ae7b279c96200b853008a352fa110ac2565f3dc5
share-edit-link = Enlace de edición
# en: 12355fc4c6eeb80306a7fe5199240b694bf2b85e
share-present-link = Enlace de presentación
# en: bba41b4c62a01956942830c32fc1498945c30fcd
share-copy-into-new-document = Copiar en un documento nuevo
# en: 2f84eea5d45da4f1ce1760b85db18a854f4e1b39
share-copy-link = Copiar enlace
# en: 6e9d1ebfe7124caf277155d2f57b5a6787f30198
share-copy-of-title = Copia de { $title }
# en: 367f9cb75618d64b28286bdc4a5b8a3f4d7092f0
share-encrypted-here-service-holds-only = Cifrado en tu navegador. Nuestro servidor solo guarda el enlace cifrado y lo elimina cuando caduca.
# en: db4fb5a00a9a2172e9d45a362ff1b772884f64b5
share-expires-in-n-days-date = Caduca en { $n ->
        [one] { $n } día
        [many] { $n } de días
       *[other] { $n } días
    } ({ $date })
# en: ae9d408cb75f0f6745c4a64cb802e6442cc299f4
share-expires-in-n-hours-date = Caduca en { $n ->
        [one] { $n } hora
        [many] { $n } de horas
       *[other] { $n } horas
    } ({ $date })
# en: a202af448924971f4ffb4dc06ed405775781207e
share-expires-in-n-minutes-date = Caduca en { $n ->
        [one] { $n } minuto
        [many] { $n } de minutos
       *[other] { $n } minutos
    } ({ $date })
# en: 0ef0475467d903f5adb0297bbc7979b7b0792d0c
share-opens-as-pages-to-read = Se abre como páginas para leer
# en: 8744400a02796b44742f8f5e5b66216821eab90d
share-opens-in-editor = Se abre en el editor
# en: 7fbbb75c4e853ef0e42da5fe316344fdf1a6143c
common-whoever-opens-this-link-gets = Quien abra este enlace recibe su propia copia. Sus cambios no aparecerán en la tuya. Pídele que te devuelva su enlace.
# en: 94b01acececc033463cc7731d659fbcae11c2b47
share-short-link-that-expires = Enlace corto que caduca
# en: fed3d23d480dd0bfe5a0cfff4d9f3dae7857fbe6
share-this-link-expires-in-n = Este enlace caduca en { $n ->
        [one] { $n } día
        [many] { $n } de días
       *[other] { $n } días
    }
# en: 5f55ae03e19eebbbd3a277a7647d0b2ac27c4ec8
share-this-link-expires-in-n-hours = Este enlace caduca en { $n ->
        [one] { $n } hora
        [many] { $n } de horas
       *[other] { $n } horas
    }
# en: a37642996477c73f2e3335a1e06a28d577806b52
share-this-link-expires-in-n-minutes = Este enlace caduca en { $n ->
        [one] { $n } minuto
        [many] { $n } de minutos
       *[other] { $n } minutos
    }
# en: 04609a8df41f042b261ed7cf06b80c2667badd0e
share-this-link-n-characters-fits = Este enlace: { $n } caracteres, cabe en un mensaje de texto
# en: 822e1dca627d6149b0263bdae6477ca56c62a36c
share-this-link-n-characters-too = Este enlace: { $n } caracteres, demasiado largo para { $where }
# en: f9551d11c51a8da0015b0716e3aab327784b2ec2
share-discord-message = un mensaje de Discord
# en: 36dec9aa0b166bef869350675231f78529bbabd8
share-a-qr-code = un código QR
# en: 13be5551761c07ae1735af2e3fbcea08dae3dce3
share-link-in-google-docs = un enlace en Google Docs
# en: 66ab040bba28a1d3d5307879564a2bf9ff2ae108
share-telegram-message = un mensaje de Telegram
# en: aba5163784cd5c92d1a33174634785cace589ca8
share-a-short-link = un enlace corto
# en: c372595cddc6ae62ad3eb2ddfaa7cb6546e4df31
share-small-nfc-sticker = una pequeña etiqueta NFC
# en: 7be07ec57c401332cca2718a0d4a6a516b77527f
share-text-message = un mensaje de texto
# en: 1efc6b2c2c837a8ce7a9054983d97158307b3c0e
share-chrome-and-edge = Chrome y Edge
# en: 777a1e3310cf18433544371b9f5422bf0ba0ac80
share-nfc-sticker = una etiqueta NFC
# en: 219dd04dbbbc2c0867d0f2c748fdc25f6aba89f2
share-some-browsers = navegadores antiguos
# en: 77437a6dfcf7562798d4a066e19fd698b357c1a8
share-n-short-links-kept-here = { $n ->
        [one] { $n } enlace corto guardado aquí
        [many] { $n } de enlaces cortos guardados aquí
       *[other] { $n } enlaces cortos guardados aquí
    }
# en: fbdda8ea6ae4f71eb78a8bd78fa2746784806ffe
share-display-link = Enlace de vista
# en: 54c374d4a68f528c4c4022d195a62e22b4bf57bb
share-opens = Se abre
# en: c2e98476efb5e35f50dae898c1b56d7085eee7da
share-link-copied = Enlace copiado
# en: 4dfbe46077fcd9769d6688a682515a0cf12a7d80
share-could-not-copy = No se pudo copiar
# en: 24897bc1ceb803cb3796e491bc10a252f16a950f
common-share = Compartir…
# en: abba02fcdd8b9ce1dde7f39b5b6aa0bd741f0d57
common-qr-code = Código QR
# en: 7f8c79bef572d079a2e70de568104a605b4050cf
common-qr-code-of-this-document = Código QR del documento
# en: 5987984bd3953aa88448226f480b1c67ad98ab52
share-this-document-is-n-bytes = Este documento pesa { $n } bytes; el código QR más grande admite { $max }. Acórtalo en { $over } bytes y cabrá.
# en: 716ebea121ec7b8a4dd9ea47314131122cf0aab1
share-this-document-is-n-characters = Este documento tiene { $n } caracteres; un enlace corto admite { $max }. Acórtalo en { $over } y cabrá.
# en: ae5014875f1eec5203f8744323723d2ee679d1cc
share-expires-after = Caduca tras
# en: 1e1c72c2e33894ad38b820f1d4ed17ef478067be
share-hour = Una hora
# en: 4286c1f81faa848587ed38925e9b181e939f4998
share-day = Un día
# en: 51e2a8b00255a6db1c49b306e7ac28f2e6ac9a23
share-week = Una semana
# en: 6d17c3840dec7c16f42f223c4a5472efbbff08c1
share-month = Un mes
# en: 38c22f9dbdb41d2131b4324b7722c45a1f543420
share-make-short-link = Crear un enlace corto
# en: 94d7d8ee473f817fa4b57737e7a01ec3cd13d4d4
share-making = Creando…
# en: 1c6c031b40782efe6b28678fc42d5569cc11e029
share-hundred-links-day-from-one = Límite alcanzado: 100 enlaces cortos al día por dirección. Vuelve a intentarlo mañana.
# en: 0b5140c5b10a2b84301b5ef43056b7d89bd2187c
share-short-link-cannot-be-changed = Un enlace corto no se puede editar ni eliminar. Caduca automáticamente.
# en: 4d9182a72e391841c2817e9943cf2b07adf70220
share-could-not-shorten-link = No se pudo acortar el enlace.
# en: 4c0067d6b6bd96cdab1ae363ce342312a93834fd
share-this-document-is-too-long = Este documento es demasiado largo para un enlace corto.
# en: a4d0b704a911979249dd2629e81a0205fab0aa44
share-up-to-hundred-links-day = Hasta 100 enlaces cortos al día por dirección.
# en: e963907dac5cd5c017869b4c96c18021c9bd058b
share-remove = Quitar
# en: d0517071aa376e797705058bbad4b658954b9930
common-link = Enlace
# en: b15dbf0da72e08fcfcf35d2aed0a937335b9cc5e
common-short-link = Enlace corto
# en: 9095e39b9975250b05476c852d1631a6651924d9
share-new-noun-date-n = { $noun } { $date } n.º { $n }
# Files, compare, posting and embedding: the agent and sharing surface.
# en: 1c2edb3104c7f2adce9ad2a77f3622d1beb0059a
share-mastodon-server-like-mastodon-social = Un servidor de Mastodon, como mastodon.social
# en: 64fbd995d3b6b156ee26ae3c03e6516434c34c12
share-change = Cambiar
# en: 2a07ce9a22d8e5dc1031e531518f04e50855319f
share-copy-embed-code = Copiar código para incrustar
# en: c3e1c83e5b4172d3c738e37cb69b76d93ce49b8b
share-copy-show-link = Copiar enlace para presentar
# en: ad02e14e2841dfbd22ab2caa12b5541c5b01a53a
share-embed = Incrustar
# en: 4eeede7134d362f371fd18b2d63d3199bb24f01a
share-embed-code-copied = Código para incrustar copiado
# en: 682cbb0f328f16ee213c6b44d7012512b55506b7
share-opens-deck-already-presenting = Abre la presentación ya iniciada.
# en: 7858ac3ff63354f37161bd349efe11edd13b89cb
share-post = Publicar
# en: c68fca11627c0ac342583c1782892518730cc40b
share-post-link = Publicar el enlace
# en: 82584c3ce64f57a310db6846c65628266a88c44d
share-show-preview-of-first-page = Mostrar una vista previa de la primera página
# en: ac1624e1fa626a4ba8b8ee419f0cf118d53fa480
share-picture-of-first-page-and = Una imagen de la primera página y el título se guardan legibles en nuestro servidor durante un mes para que la red pueda obtenerlos. El documento en sí, no.
# en: 6a46f4b4b3f001e64ef9652412aa1ddbdeabc489
share-shared-without-preview-reason = Compartido sin vista previa: { $reason }
# en: 4def5924266f682e91bcdff1e5ba510a20a36902
share-making-preview = Creando la vista previa…
# en: b0e8d8d6d97acaeed4ad09f7b25699817638ae6b
share-page-could-not-be-drawn = no se pudo dibujar la página
# en: b3dcb32d0d95afbd62938ff614915e68ba996861
share-picture-is-over-400-kb = la imagen pasa de 400 KB
# en: 398d796772eebe6fc3207881d76d2cf9f155da3f
share-server-could-not-be-reached = no se pudo conectar con el servidor
# en: 686fd096a5f35bcfbcdcc5130d1be03e593d7bfa
share-hundred-previews-day-from-one = cien vistas previas al día desde una misma dirección
# en: 959db3cd3ff1a424890a809f9cf7445f37db3289
share-server-refused-picture = el servidor rechazó la imagen
# en: af490175b729a82a4315134642a89f1f87681967
share-pages-in-frame-on-another = Las páginas, en un marco en otro sitio, con un enlace para abrirlas aquí.
# en: 9377de06278eacbdf4a297a82b8eb9aa3d4220c0
share-your-mastodon-server = Tu servidor de Mastodon
# en: fccb3597262f866e1c1f6a9f20bdd2439a0370b8
share-this-link-n-characters-n-bytes = Este enlace: { $n ->
        [one] { $n } carácter
        [many] { $n } de caracteres
       *[other] { $n } caracteres
    }, { $bytes ->
        [one] { $bytes } byte
        [many] { $bytes } de bytes
       *[other] { $bytes } bytes
    }
# en: 525f61b6729229b1a8854a9e50bcaa52ea96b131
share-where = Dónde
# en: 55f653107f261dcc84be0568f5812694250f2e96
share-max-link-sizes = Tamaños máximos del enlace
# en: 24d948e4bdbe5b8224bbc0dfbab1923fab00b98e
share-limit = Límite
# en: f9f775ef8d81d0adcdb54a1de51a58a5ab9d24f6
share-fits = ¿Cabe?
# en: 0e1a1a74c78e1f4b6e8efcb92b18aea677212d76
share-n-characters = { $n ->
        [one] { $n } carácter
        [many] { $n } de caracteres
       *[other] { $n } caracteres
    }
# en: 1991ca167949231900aa143e63134d2584d8de83
share-n-bytes = { $n ->
        [one] { $n } byte
        [many] { $n } de bytes
       *[other] { $n } bytes
    }
# en: 36f6b0318377bb84249e4845275fa2c4e63ebb37
share-no-published-limit = Ninguno publicado
# en: 5397e0583f14f6c88de06b1ef28f460a1fb5b0ae
share-yes = Sí
# en: f37d6e1b1ff2eeb01d7bee0aadef337300b9db53
share-yes-n-left = Sí, quedan { $n }
# en: 63dfcadd40126551301f363efd454c7d2c610b94
share-no-n-over = No, { $n } de más
# en: d2857acb2857d3f0021e0ffbcfc8730c9a6e2548
share-yes-counts-as-n-of-max = Sí, cuenta como { $n } de { $max }

## privacy (kit/share/privacy.ts, kit/ui/privacy-dialog.ts): the password, what the device holds

# The Share dialog's head line: "Created 9 Oct 2026, 14:03 · by Paul".
# en: 07fd5d289286fa4714b3f407db7875fac90b9952
privacy-anyone-with-link-will-need = Quien tenga el enlace necesitará la contraseña para abrirlo. No se puede restablecer. Si la pierdes, perderás el documento.
# en: 8c684290ce0b8a8e6cee79a145e17554064a4760
privacy-change-password = Cambiar contraseña
# en: 5be0d11b94b1ba25b2579314f6af69649a900cde
privacy-created-date = Creado el { $date }
# en: 39e64aebf907392389952dded5e20ab4836d876a
privacy-enter-password-to-open-this = Escribe la contraseña para abrir este documento.
# en: 554393a215e479d023a30091a1394f7ca57690e1
privacy-forget-everything = Eliminar todo
# en: 715727cdd46f1bd0703c9e846fcdd4f369ef8313
privacy-preview-sent-with-link-to = Una vista previa enviada con un enlace a una red es una imagen de la primera página, el título y las primeras palabras, legibles en nuestro servidor durante un mes. El documento en sí nunca va allí.
# en: a584ece11551d9b1a79856743236c51aba50c44f
privacy-forget-everything-this-site-keeps = ¿Eliminar todo lo guardado en este navegador y dejar de guardar? Tus documentos siguen existiendo en sus enlaces.
# en: a798882f1c31099bb9500e2da62c0874d8dbed78
privacy-locked = Bloqueado
# en: a543040c9fee74b4b34282797abbf59e9d2c99b7
common-locked-document = Documento bloqueado
# en: d850ee188c7c55b64bc3624534de5c5051a57dc6
privacy-new-password = Contraseña nueva
# en: 1851836868be57a15ca3684a090210f53c7a98f8
privacy-no-password = Sin contraseña
# en: 6eef6648406c333a4035cd5e60d0bf2ecf2606d7
privacy-none = Ninguna
# en: b1b8530bbd687503cb5486e906942912fb68c231
privacy-opening = Abriendo…
# en: 8be3c943b1609fffbfc51aad666d0a04adf83c9d
common-password = Contraseña
# en: 114bea5817640fe6b9eeec86b939ec0e9a7b6d76
privacy-password-removed = Se quitó la contraseña
# en: ad1909e464528c140bf96a21ce9adda2464956c0
privacy-password-set-link-holds-only = Contraseña establecida. El enlace ahora está cifrado.
# en: dce69146962b392ae2b157aec604eface36e90c0
privacy-password-ellipsis = Contraseña…
# en: 9dfd349ebee555eb8d652be20dad971cae439eca
privacy-preferences = Preferencias
# en: cf01481f626d5127ec7732fcbdb29504f08abefd
privacy-privacy = Privacidad
# en: cefceeebf3cd6d02ddc7aca8c769881a5341e829
privacy-nothing-saved-in-this-browser = No hay nada guardado en este navegador. Lo que aparece en la lista dura solo esta visita.
# en: 626a605da9dbcd888eadcad13deebd3a64011c0a
privacy-protected-by-password = Protegido con contraseña
# en: acef17d00b9a1b6e1e15e76d27ae53635928a7a6
privacy-remove-password = Quitar contraseña
# en: 788f55b0957b15918c6aba279f4f0377a5a1db90
privacy-sealing = Cifrando…
# en: 94408e41c12e924b82da7ea6e79e5cb69ac9e042
privacy-set-password = Establecer contraseña
# en: f897cb67f049674308a073079bd85ad0649f8c82
privacy-short-links = Enlaces cortos
# en: c706d94b54ef0b520420dd58063cfc78bc88c7e3
privacy-set-password-in-share = Establece una contraseña en Compartir
# en: e546afa59de2ec4b23ca6c4fafbaddac7bab9240
privacy-short-links-made-here-until = Los enlaces cortos creados aquí, hasta que caduquen.
# en: b556bf027f9123d39581babef7e15564c24866da
privacy-their-names-and-links-for = Nombres y enlaces, que se muestran en la página de inicio.
# en: 5300fdca86b5b32fd463f73704e318a2b8fa9961
privacy-theme-lifetime-of-short-links = El tema y los ajustes de los enlaces cortos.
# en: 0c6a2cfe53459957b6899930a2e5cd46b6541cec
privacy-this-document-has-password-link = Este documento tiene contraseña. El enlace, y cualquier enlace corto hecho a partir de él, está cifrado.
# en: 0d21e52aba49ee4331213463b46c2ece33ad3cf4
common-this-document-is-locked = Este documento está bloqueado
# en: 1dc606b1828a1e2f5bbbed9ed30fa3a80712e3d8
privacy-this-document-is-locked-with = Este documento está bloqueado con una contraseña.
# en: 1526a17ee7570e6235eb76a6fef8ce4b6d9a3486
privacy-unlock = Desbloquear
# en: 887b0828ec99930408eb32249f1209057b1b234c
common-unlock-ellipsis = Desbloquear…
# en: ce3661a255464b1b22e6f395685d0e6f9fa077da
privacy-what-this-device-holds = Guardado en este dispositivo
# en: 8485be9e7b3e998c5f1eef5ce87d2aa67726e3cb
privacy-your-documents = Tus documentos
# en: d21905a9907932f7976e1ca96129c0af871f2715
privacy-your-browsers-history = El historial de tu navegador
# en: cdff70e571d4ed7aeb1a43cedaf33299bdcd258e
privacy-every-document-opened-here-in = Cada documento que abras, completo, salvo que tenga contraseña.
# en: 18b8a03ed6567555edd5005aab5b090984f4b5bd
privacy-not-ours-to-clear = No podemos borrar esto
# en: 3ca2d1d26637d42b974b313bb8ce231333179a9e
privacy-by-name = por { $name }
# en: a9e72cf83916d4381012a19b329292818f845a43
common-n-documents = { $n ->
        [one] { $n } documento
        [many] { $n } de documentos
       *[other] { $n } documentos
    }
# en: 1a8f1553a9832c92927784f88f31a89cd991e803
privacy-n-links = { $n ->
        [one] { $n } enlace
        [many] { $n } de enlaces
       *[other] { $n } enlaces
    }
# en: 2ddd4097832d991c46023732a889beeb8ec4c29d
privacy-n-set = { $n } guardadas
# en: a97ce1edde4ad396d1cff34063087d0bf5d0e1a8
privacy-copy-this-and-send-it = Copia esta contraseña y envíala aparte del enlace. No se volverá a mostrar.
# en: 7640428ae16fc2b673d689ddf6b1ea15eed407d3
privacy-make-another = Crear otra
# en: 9a0081f0b2bff82fac1961a403734134b9a3b170
privacy-password-copied = Contraseña copiada

## a document locked with a password, placed inside another (kit/share/locked.ts, kit/ui/locked-doc.ts)

# The card drawn where it sits; { $app } is the app's name: "A Spreadsheet document, locked with a password".
# en: db4307e70c2d2722c2af2f79643b28e73325e9be
common-with-password = Bloqueado con contraseña
# en: fa27fac915c0c87aec9006392ae6422f59857f5d
locked-app-document-locked-with-password = Un documento de { $app }, bloqueado con contraseña
# en: 49db1d83c8636baba474ad11626b5a7c5260976f
locked-with-password-unlock = Bloqueado con contraseña. Desbloquear…
# en: 507e778ae244911abcb05b73967febd0edb425a5
locked-document-locked-with-password = Un documento bloqueado con contraseña
# What one of them is called in running text, as an app's noun is.
# en: 78ed9fb58f4437d5d29cf78ba699a560017abe47
locked-document = documento bloqueado
# A placed document whose link cannot be read (cut short when it was copied).
# en: 0c45986cb6755e463398a592a861baaf44018954
locked-this-document-cannot-be-read = Este documento no se puede leer.
# en: a2a127edeb3eed5dc264fc299b034db6493e1636
locked-that-password-does-not-open = Esa contraseña no abre este enlace. Si sabes que es correcta, puede que el enlace se cortara al copiarlo. Pídelo de nuevo o pide un enlace corto.

## words several apps share

# A menu of what can be done to the document as a whole (the Presentation Builder's submenu).
# en: 6e16ec256749730ccec984c8efeb7804db5b9737
common-this-document = Este documento
# { $task } is the task's words.
# en: 15f18f71eefc9fedc6fedd434c2edc6a919bf130
common-done-task = Hecho: { $task }
# en: 00c65041972e0368c2c8b452d60c0a0754fcc9bd
common-drag-to-move-tap-to = Arrastra para mover, toca para seleccionar
# en: 525df57dc3610e74377113b92951476bb9387e4d
common-move-left = Mover a la izquierda
# en: 3a43e56f34dece6eb3d79dee1eff7b2f87db6040
common-move-right = Mover a la derecha
# The group heading the Calendar and the Trip Planner sit under on the home page.
# same
# en: ae2f98a099fe5855c31126233e9c13641ee7fdba
common-plan = Plan
# en: 9985434cd07212b8dac01f8e015a1fa8adac9a99
common-chosen-tasks = Tareas seleccionadas
# A link that opens the document (kit/ui/compare.ts).
# en: cf9b77061f7b3126b49d50a6fa68f7ca8c26b7a3
common-open = Abrir
# en: 7bb0ddf9221c03b806b03c209e8366000124aa15
common-task = Tarea
# en: 090ec5f560fc50377fcd95e5cda128e91b276e98
common-tasks = Tareas
# en: 1835508670fb85faefa88cd88d4f57d3cdb00716
common-find-app-doc-template-or = Buscar app, documento, plantilla o comando
# en: 0d47323c5ee8dde30a5ca28f6ed6103d42081b97
common-in-this-document = Buscar en este documento
# en: 733a5f2fb910bb704c7993cae3d8224558d405de
common-indent-or-bring-out-in = Aumentar o reducir la sangría de un elemento de lista; siguiente celda en una tabla
# en: bf6e36633c2362cb7fa31a0e8f833388a49ba28c
common-move-selected-items-up-or = Subir o bajar los elementos seleccionados
# en: 989fe994e413c509c03d3dd229b775a3ddc4707b
common-nudge-shapes-in-hand = Mover un poco las formas seleccionadas
# en: b11d72438f1b00b65769e9b8597829583dc4d631
common-select-all-words-of-box = Seleccionar todo (primero este campo, luego todo el documento)
# en: be76d0b25853b431767ca5b5d57ef569bbc6ff2a
common-back-to-words = Volver al texto
# en: 0c0b01d469faff60dc3b2d1c035ee0a7caa03852
common-extend-selection = Ampliar selección
# en: 11a8a25332234992a14424d8aad6fb9ce3d3b287
common-next-or-one-before = Siguiente o anterior
# en: b4365b2ed2016713788d08335e5157985010ac28
common-step-out-close-collapse-let = Cerrar o deseleccionar
# en: fb2997642419cda8393061543f140d40a9323957
common-check-or-uncheck-task = Marcar o desmarcar una tarea
# en: 0a4adf12f01d48ecdb89f5eddf5f19fd89d94522
common-too-long-for-qr-code = Demasiado largo para un código QR: acorta el documento o comparte un enlace corto.
# en: 1e14a1c5e931f6ef8ce8378377366f3c68cef56c
common-n-of-count = { $n } de { $count }

## downloads

# en: 5b221e9c2a451799d8f37e2b9874409d5e03ab05
download-print = Imprimir
# en: f304fc6dd3e87a37a6c53cb62344c10a789a7ad9
common-print-or-save-as-pdf = Imprimir o guardar como PDF
# en: 473b3126e859286ef98d231328fa11a3216823a1
download-picture-png = Imagen (PNG)
# en: 3ad1b6c4e3dcf07e9ac0c95d5303f7ca4f89e55e
common-web-page-html = Página web (HTML)
# en: 1ba61ab4dec3fa0358c9ed0c77d6ac46f598a1f2
download-text-tlo = Texto (TLO)
# en: 840a0fda84379bffc2a266a92bbb990672a7c8d2
download-data-json = Datos (JSON)
# en: f77017c03d9d2be93a74ef7ef7e099dd77976f01
download-downloaded-name = Se descargó { $name }
# en: 01125e1be1f56cdaa47c6314a158e1219af819b3
download-failed = No se pudo descargar
# en: e7f6a6728b280414756d238ae70084720018ba47
common-open-in-tiny-little-office = Abrir en Oficinita Diminuta
# Under a document cut off at a slide's foot: a link that opens it whole, in its own app.
# en: c510d6c04c0951500c8e43f623e9f8886c378aec
download-see-more = Ver más

## the bar, shared by every app

# en: 95802daab3a23990338179f72248350c1434cf39
common-insert = Insertar
# en: 19e07430eed6d97d6d73cb4a2967b1f316520f54
bar-bold = Negrita
# en: 1616e2e5405e69c4e3914c67c644a9bd3ac00956
bar-italic = Cursiva
# en: 39773aa3efa19090c918baedac1fe737dea25b92
bar-underline = Subrayado
# en: a93b9a6808a95ca93515164188159659017155cb
bar-strikethrough = Tachado
# en: e1da9275bc5b420601738531d5e4445b44e0e6e9
bar-highlight = Resaltar
# en: a3089b7fae27bca3309070e0487079a25b8f1ede
bar-heading = Encabezado
# en: dd870cfcae5fa76d524491679a57b27d41ffb462
bar-bulleted-list = Lista con viñetas
# en: 8294ea4f78d097513144a9b8ba4e6d545a2a19e1
bar-numbered-list = Lista numerada
# en: 0424f6e7026fa4bc2c4a7043083417315113c79b
common-table = Tabla
# en: 40e31a210a1913fd0a8b28b892780996d154c70d
bar-footnote = Nota al pie
# en: eb9a4bc1c0c153e4e4b042a79113b815b7e3021d
common-date = Fecha
# en: 39fc72124884d6573e4f9f89585f071ed0782696
bar-undo = Deshacer
# en: 471b94d402d16a5fe7549d001a68ada1f7ddb16f
bar-redo = Rehacer
# en: 24345a14377fd821d3932f4e82f6431640955b0b
common-today = Hoy

## the editor (<to-text>): chips, cards and the bubbles

# A footnote's mark, and its words where the notes are drawn, by its number: spoken.
# en: f91f3abb5afff1229edcc701ea915aadef98aca8
common-footnote-n = Nota al pie { $n }
# A card standing for another document held in this one, of a kind no app here reads: "abc document".
# en: ae6aebc074024e9de875113693a49f1e19bf555f
common-app-document = Documento de { $app }
# The same card when its app is known; { $noun } is the app's noun: "A spreadsheet".
# en: 3f77d60418ea2f6a04196c1e67715b3007390e77
common-noun = { $noun }
# en: adac69379a626c2436948a4ef1792c7d719ef929
editor-code = Código
# en: 6512ee1541e9a6c52d5bf7cf465332e8df25ea3c
editor-connection = Conexión
# en: 86ccb2898e6f07a6967cf007c54e365e26ba776c
editor-n-rows = { $n ->
        [one] una fila
        [many] { $n } de filas
       *[other] { $n } filas
    }
# en: 221e4b1822bb3e80534c57d63a89d0f58d85c77b
editor-notes-words = Texto de la nota
# en: e9b450d14bc2363d292c84f17cfad5cfbd58a458
common-done = Listo
# en: d70f93df5e8f9b55be44fbeee9d203972e3383d4
editor-address = Dirección
# en: 74d3b25667541c75d79e0558305f4bda62229bd7
editor-not-address = No es una dirección
# en: c8648f259049ce8bdb49529963c37a97f75e8d4b
editor-set-link = Añadir enlace
# en: d2de1a2831e7fee28d6c8d214b66da0d1bed30c8
editor-open-link = Abrir enlace
# en: f377ac75602950b2c36449de5bceb3c12333ac77
editor-change-link = Editar enlace
# en: 8d48d1f9e74c4fecd89a67645ca3593ef0964710
editor-remove-link = Quitar enlace
# The selection bubble's name: what can be done to the words selected.
# en: 041a5dec481d6bf0724caeaa84bc135d7d9062d4
common-format = Formato
# en: e5fd9cfe0e8039111d54b588e77b2bb0cad41c3a
editor-done-lowercase = hecho
# en: 4ed7199b77561b7a7c013f7a8504b6686496302d
editor-not-done = sin hacer
# en: 984cfca8d70e0b1e37a9e70c98a219bb12a05f23
editor-bold-italic-and-links = Negrita, cursiva y enlaces
# en: a983f10d71bb808f58795f6ae728a6e76f08ce78
editor-one-of-words-column-holds = Una de las palabras de la columna, o una nueva
# en: e31d972229de381b461860014dd710856361917a
editor-option = Opción
# en: eb883fb88ed57f39b760fee6ee8f5a04a8cdc7ba
editor-this-browser-lets-page-paste = Este navegador solo permite pegar desde el teclado o el menú Pegar.

## the example in the kit's own documentation

# en: a76d4605993fe042c6e171382b1fba057fa31ff7
example-n-slides = { $n ->
        [one] una diapositiva
        [many] { $n } de diapositivas
       *[other] { $n } diapositivas
    }

## the Word Processor

# en: e8e834c4d268a3032b26958914d01ef0addf080e
common-word-processor = Procesador de textos
# What one of its documents is called, in running text: "Untitled document"; each app's noun is in its section.
# en: 4f8278c89ad16da05fec4fdfc61fe44798b92720
write-document-lowercase = documento
# The group heading the Word Processor sits under on the home page.
# en: d26d55c7f815c82cf430c3915b3bb833d3f02e5e
common-words = Palabras
# en: 703864836e29b00a7c7490f714fd2d18474de840
write-words-on-page-headings-lists = Palabras en una página: títulos, listas, enlaces y notas, una tabla que suma; para imprimir en carta o A4.
# en: e214b8a29923056887b7edf6635d90dcbb2abe88
write-document = Documento
# en: 6e660ac1c8b81a53e302f6bb0298551ec820eceb
write-here = Escribe aquí.
# en: 6b8ad00f4398c3aa47f82637d019dad9e4f9da0c
write-subheading = Subtítulo
# en: 05058e0b630498611ebc41894f7b1670dcd5870e
write-paragraph = Párrafo
# en: b4d812c8bee8056808c14f1b31b6765342c8437e
common-bring-out = Reducir sangría
# en: aacf42132cce6cf5c1608a5d27f90fcbf93ae851
common-indent = Aumentar sangría
# en: c83b0ec2d98a2ca38077be2f03102aedeb0ab261
write-align = Alinear
# en: b442b455b6a5e55f249769068c3fcc4832aea89d
write-align-left = Izquierda
# en: a2391118c8141b7f016207cb0da015ce9b3323e4
write-center = Centro
# en: 9bb446b31da260be7a0206a0e15270eb6bf47255
write-align-right = Derecha
# en: 536d2746f7f2f88df35515a9cd5e44cb1582b9ca
write-justify = Justificar
# en: 2ed7f99f153a2a3dd123644137db651eb191b2b2
write-paper-paper = Papel: { $paper }
# The Look menu: each look's name, then a line about it drawn in its own type.
# same
# en: c1ccf83eea101ddafb5de4e3dea5f3693ae473c0
write-sans = Sans
# en: 2fa97b3a9a6621a3a887ef5686bf4604fa6804e6
write-clean-and-plain-throughout = Limpia y sencilla en todo el texto
# en: 56632c1841ab67cf1e7c7179b9c5ea0e32ea81c1
write-bookish-serif-throughout = Una serif de libro en todo el texto
# en: 7daed9b46fb34186159d19a2dca5208daf510f54
write-monospace-ragged-right = Monoespaciada, sin justificar
# en: 9ec6ab25de9a050b550600a98c5a63e5b2c00bf8
write-serif-and-sans = Serif y sans
# en: b3ca8ebc46d597ea38c5f4877cf7ae7bfb4e3d68
write-serif-headings-sans-text = Títulos en serif, texto en sans
# en: e0c6a397d49350373ed4d55573e9365c212631bc
write-sans-and-serif = Sans y serif
# en: d9d9d24d3963e4acfa41725ddd5a228f70b0869f
write-sans-headings-serif-text = Títulos en sans, texto en serif
# en: f69f233005f15802770fd26fbf7ead52ec13d9e6
write-book = Libro
# en: d242210a93b0f91c16b76df2eaf8efc7ae211585
write-justified-indented-small-caps = Justificado, con sangría y versalitas
# en: 5ebe6500747dd5dbad08cc1b33d55fac89ccbe97
write-newspaper = Periódico
# en: ed0ae2181b2137e6b9f63fdbaeed415ac7e73502
write-narrow-headline-two-columns = Un titular estrecho, dos columnas
# en: 62fb6cfda0506f0ed73ad066151086d3eed2296d
write-horizontal-rule = Línea horizontal
# Insert ▾'s rule in a document: what follows starts the next page.
# en: 830b8871f026d13b7b94d6723471f2b4e152e360
write-page-break = Salto de página
# en: 9ce3bd4224c8c1780db56b4125ecf3f24bf748b7
common-ok = Aceptar
# en: f2dc2c1e1465864ffbc4e8100c86cfeeafc4fffe
write-this-card = Esta tarjeta
# en: 1e06557fc0660e50a99fa6eef90bff822411e3ae
write-open-in-app = Abrir en { $app }
# en: 108add9c9b3eed03ee5eb57783d780a485840218
write-locked-worked-out-for-you = Bloqueado: calculado
# en: ec0c3b76630fd745381cc215a284820af75a683a
common-footnotes = Notas al pie
# en: 5c71d5f47999af43b0a80e72abd8e5b79e736f80
write-back-to-footnote-n-in = Volver a la nota al pie { $n } en el texto
# en: 6bc94b9eb554810d980ae7fb5673badbbb0b531c
write-back-to-text = Volver al texto
# en: be51f46400fec04e375ba1ea35d98d05b69a1a2e
write-n-words = { $n ->
        [one] una palabra
        [many] { $n } de palabras
       *[other] { $n } palabras
    }
# same
# en: 71d562b7d96e16456a25e7230f3bc08bb796552a
write-word-docx = Word (DOCX)
# same
# en: 23e67fceae0d77dd571dd25695fc0499faf1bb77
common-markdown = Markdown
# en: d50fcd6f846a2616a90ec5dd1f67488a993c2743
write-rich-text-rtf = Texto enriquecido (RTF)
# A table in the text: its heads, its handle, its column menu.
# en: f4344253d823d09db13bc3877d37c9618588506a
write-add-column-before = Añadir una columna antes
# en: 9b3acfc74a5d37d699868ade0ed3d142024174cf
write-column-c-what-it-holds = Columna { $c }: tipo, nombre, añadir o quitar
# en: 1f01479a40aa348fc273d4d09636403f89eff717
write-table-move-copy-or-take = Tabla: mover, copiar o eliminar
# The templates
# en: cfd76febbb671e54b2f280128fb5c317389758a7
write-a-letter = Una carta
# en: 7456f1ce5f81c497b66302751f617f60612306f6
write-your-address-date-greeting-point = Tu dirección, la fecha, el saludo, el asunto, la despedida.
# en: ae3cd6584a49de52c70c1e00ae0a02c8abab166b
write-meeting-notes = Notas de reunión
# en: 7bbe470d4a5d9510c0fcb6844b519d118681beb7
write-agenda-what-was-said-what = Orden del día, lo que se dijo, lo que se decidió, quién hace qué.
# en: 9fb58963c66db0c8ca7c638f491e82246e226d30
write-resume = Currículum
# en: 3f3c7baad1c18a4ab23412f60d65b5179346006d
write-name-and-contact-experience-education = Nombre y contacto, experiencia, formación, habilidades: un currículum ajustado a una página.
# en: 5a0ba3bb83f0992ba00ae94db6a7464210c40711
write-contract = Contrato
# en: 50899f480b3395ee509689b06672ad9d8719e082
write-plain-words-agreement-what-each = Un acuerdo en palabras sencillas: lo que hace cada parte y cómo termina.
# en: f9f38818c406d0878defb17a2356e1a2c658861a
write-invoice = Factura
# en: 4e056cf73efd0995ce1e7c5fd88900894935896c
write-who-what-and-how-much = Quién, qué y cuánto, con las sumas hechas en la tabla; lista para imprimir y enviar.
# en: 80c40a5c8be53118fd8a9fc487b43f20c3014fbc
write-cover-letter = Carta de presentación
# en: fe727759e1b85df4a1d71348a1a6dfd6ef8e135d
write-applying-for-job-position-what = Para solicitar un empleo: el puesto, lo que has hecho, por qué esa empresa, en cuatro párrafos breves.
# en: 1fd79b9555ddf59862d60aa0aa3bb74fb74aae78
write-memo = Memorando
# en: cfa5a189ad757d015661acb500917a198d8a13e1
write-to-from-date-and-subject = Para, de, fecha y asunto; el cambio en una frase, por qué y qué respuesta necesitas.
# en: 092f99ea11a34a8490e7a767a83a42fc45634f82
write-minutes = Acta
# en: 34dbbbeddd62f120a000701c56adebc8bae95352
write-formal-meeting-who-came-treasurers = Una reunión formal: quién vino, las cuentas del tesorero, una moción y su votación, las tareas.
# en: e04a25d1f69061bfe7770b16891fca2c413bcbe0
write-one-page-cv = Currículum de una página
# en: 11628c83c5de19d1338628ed7153b648f496b27c
write-typewriter-set-cv-now-before = Un currículum como escrito a máquina: ahora, antes, formación, idiomas y herramientas.
# en: 6ed05e720ccc3ef269db1b38201da8b873acc895
write-newsletter = Boletín
# en: e583899cf44dbc07e6d8d4e7a252d39552e4e3d4
write-block-associations-month-dates-in = El mes de una asociación de vecinos: fechas en una tabla, bienvenidas, noticias y agradecimientos.
# en: 1dcda804c96da3cc7e73e8a1672d4379a741f11a
write-recipe = Receta
# en: 72490fa559ee9ce5ed498b58b3e2cad900af7155
write-what-you-need-in-table = Lo que necesitas, en una tabla que pasa de cuatro a seis raciones, y cómo se hace, paso a paso.
# en: aa3ddab4d749b73414ddd65201f9c6553b98a49b
write-questions-and-answers = Preguntas y respuestas
# en: 1854b96dd11603bed03cce723369ef661a6f34f8
write-questions-people-ask-each-heading = Las preguntas que la gente hace, cada una un título con su respuesta debajo.
# en: 6d234a17fecd5048e790eb4d1c415e17899a0e56
write-press-release = Comunicado de prensa
# en: ba41d12bbba317bcacf230155abba7ce9e400379
write-news-in-first-line-detail = La noticia en la primera línea, el detalle, una cita, el horario y a quién llamar.
# en: 0c30f8a886ae8207e0702b4daf5eda405b19a131
write-news-article = Artículo de prensa
# en: 66280b179ec208e759c8fd7e05a4b1171c355c9f
write-headline-byline-story-in-two = Un titular, una firma, la historia en dos columnas en papel y un gráfico con las cifras.
# en: 19ad8ec7231e0cc9d9ea7e0684742672018e1f05
write-interview = Entrevista
# en: a8d0cc9ab05d2f4925e897a47c9c9554e289fb4e
write-introduction-then-questions-and-answers = Una introducción, luego preguntas y respuestas, con cada interlocutor nombrado.
# en: 94a18e60341a34b6feec02442ec2d70ee1244900
write-book-review = Reseña de un libro
# en: a8ccbb45148f664a9800e533e32902524ce8217a
write-book-stars-what-it-is = El libro, las estrellas, de qué trata, qué funcionó y qué no.
# en: 1eb36cb79b31a29c161965efdbb310289b4e5814
write-music-review = Reseña de un disco
# en: 75857043416829c78af6afbfcd886ea90847e06c
write-album-label-and-length-stars = Un álbum: el sello y la duración, las estrellas, las canciones, los mejores temas.
# en: fae48a8f67fd81fb5d54b5a9c2d60929cd5da2f7
write-thesis = Tesis
# en: 8dd8017f140560c80229f7d051a8fb2376183e9a
write-title-page-abstract-chapters-with = Portada, resumen, capítulos con notas al pie y una tabla, y una bibliografía, compuesta como un libro.
# en: 42921f1b739a62eb82bc6f16ce47ff5ce5fd4da4
write-grant-proposal = Solicitud de subvención
# en: 381d823ac8ecdff832331120748c151a113b2464
write-ask-need-plan-budget-that = Lo que pides, la necesidad, el plan, un presupuesto que cuadra, y cómo sabrás que funcionó.
# en: 1b731d688386e2e229d1c2b671e96c2bfce768a4
write-syllabus = Programa del curso
# en: fc9a91d648763f9cd04a596f372b833e76f709f8
write-course-when-and-where-what = Un curso: cuándo y dónde, de qué trata, las semanas, y notas que suman 100 %.
# en: 3c847b9cd456626c998b9d2793f7701117ee4c80
write-formal-complaint = Queja formal
# en: f98daa2b60c626279045f82029a9e58dfcd90f4b
write-what-happened-in-order-what = Qué pasó, por orden; qué quieres; y para cuándo, antes de ir más lejos.
# en: f74c6bc075b1961f73f45729ce6281dc84fb3ccf
write-letter-to-politician = Carta a un político
# en: 2e754026e13e7ebe41d9513e31f94d8268341243
write-ask-your-representative-for-vote = Pide a tu representante un voto: quién eres, por qué importa aquí, y una pregunta.
# en: de21096f37522d15740e7a4acd69efc811f9b5ce
write-love-letter = Carta de amor
# en: a6977a11c96b06575fd8359e1bb9e3dea5a21fcf
write-ordinary-things-missed-letter-across = Cosas corrientes que se echan de menos: una carta desde lejos, en serif.
# en: 1af339528a1814a5f1dc409f2d108e0308035b87
write-wedding-speech = Discurso de boda
# en: b040a94a7bd386ebaee15aa4c4535da004fadc4c
write-how-they-met-what-you = Cómo se conocieron, lo que has visto desde entonces, unas palabras para cada uno, y el brindis.
# en: c88c994e6c6c50db17576753df90aac55138155f
write-eulogy = Elogio fúnebre
# en: cdc87e623e95678f786543dd272ba279df15e8ee
write-life-in-few-minutes-where = Una vida en pocos minutos: dónde empezó, quién fue, qué vas a echar de menos.
# en: 6c63ce6d4727a3fb46c16a62ac8d536b0b61fd08
write-zine-essay = Ensayo para fanzine
# en: ecce024c73aadb2150552b3419d5aa1c3cb72c17
write-personal-essay-for-small-magazine = Un ensayo personal para una revista pequeña, escrito a máquina.
# en: 563a631aba8690962836c99d15886672eb96ef62
write-petition = Petición
# en: 6d3ace089783eb6cf5e5fe47a7d74a3ee5c21f39
write-what-you-ask-why-and = Qué pides, por qué, y los nombres de quienes están de acuerdo.
# en: a6a1d25b018c9318540556e3fe374fdf8b23aff8
write-terms-of-service = Condiciones del servicio
# en: 79b220d914e24eb7ac79428e72639e8547d8ab9a
write-small-businesss-terms-in-plain = Las condiciones de un pequeño negocio en palabras sencillas: reservas, precios, llaves, qué pasa si, final.
# en: fe3b114dccf2739f949d65ac4101037eb8f92543
write-open-as-outline = Abrir como esquema
# same
# en: de69a629f9c30af3f481110f0f42a7c0c5efacfb
write-a4 = A4
# en: ee14050617b7b58e17aabccd61c241ccdafc6379
write-letter = Carta
# en: c036e85b63c6818f6732a2898cf85f30f8074bfb
write-name-this-column = Poner nombre a esta columna

## Insert's dialog (kit/ui/insert-dialogs.ts): Tiny Little Office Doc

# en: d5674bb4dcb8c5fe378eb9cd0bb9d1849ed37581
insert-tiny-little-office-link = Un enlace de Oficinita Diminuta
# en: cdea71ff947c2b49dd7d7ea146fd3efeb9fa5677
insert-opening-short-link = Abriendo el enlace corto…
# en: 9d2d34c4b04d8410e0025beb7899a31d1bc57c04
insert-paste-link-of-another-tiny = Pega el enlace de otro documento de Oficinita Diminuta, largo o corto: su primera página se muestra aquí.
# en: 7e4861cdc8de2c0c4cf87ca37c9130a92051b5b0
insert-this-is-not-tiny-little = Este no es un enlace de Oficinita Diminuta, o ha caducado.
# en: 1eb05dc15f4e90a6a61c46b111812e974555cd81
insert-tiny-little-office-doc = Documento de Oficinita Diminuta
# en: 7bb236efe4e244196e506d65542626cfe368bb09
common-tiny-little-office-doc-ellipsis = Documento de Oficinita Diminuta…
# Insert ▾'s group of the apps a new document can be made in, inside this one.
# en: f9f93f3f14cfa3eea1bfcfee97ae22cd15b25e0d
common-new-document = Un documento nuevo

## another document edited in place (kit/ui/doc-dialog.ts); a table's size is Rows × Columns

# en: 77dfd2135f4db726c47299bb55be26f7f4525a46
common-cancel = Cancelar
# en: 52d0b35277ee4b2b66ec4016620c658d99c7b57a
doc-rows = Filas

## charts (kit/draw/chart.ts)

# en: 7b6451ab3171ebc15cd43dfe0d80c1a0062c902e
chart-empty-chart = Un gráfico vacío
# en: ad5fb3b6084bf40286ee5437a7f894e0088a499d
chart-bars = Barras
# en: eb911036281c4d6d5c0b067a7951e39b0aca7b63
chart-flows-sankey = Flujos (Sankey)
# en: ecbdb15a7119ffa05cdc38ee38e20c129e28a8bc
chart-flows-list = Flujos: { $list }.
# en: c6fd3870c86e7422a0146e1e2a052437fb8e51e2
common-lines = Líneas
# en: 5a2f5ac996eef952d239a22e8d68296faf975994
chart-nothing-to-chart-yet = Aún no hay nada que graficar
# en: 7631740b7c7b5a09ad168ae28580b5c9ca4b8c06
chart-nothing-to-chart-yet-rows = Aún no hay nada que graficar: filas de De | A | Cantidad
# en: 9318d4f63aeffddc47d4520c722ad70f0ec6c63a
chart-pie = Circular
# same
# en: 40c20d94e78fa142819df8cc9440d30e65329975
chart-series = Series
# en: 79b2c4ce6295c191bf1031160055f59fb8174174
chart-kind-chart-data = Gráfico: { $kind }. { $data }

## the Spreadsheet

# en: 12acc4f41c4ad8ed5996ac33a2f066e024ba1c65
sheet-clear-these-cells = Borrar celdas
# en: c527ea0aeba3f2d0104802279fed7e595157b78e
sheet-fit-this-column-to-its = Ajustar esta columna a su texto
# en: b92fe41ac34453cd0368f0fa5d00d1e9b0279c12
sheet-cells-in-hand = Celdas seleccionadas
# en: 119faf17cd1de268ce34ade4f9bae4520774f640
sheet-check-ref = Marcar { $ref }
# The column type that holds words as typed.
# en: c3328c39b0e29f78e9ff45db674248b1d245887d
common-text = Texto
# en: cc6fdf1b0963eceb567d2f5b641f4950751636eb
common-spreadsheet = Hoja de cálculo
# en: 469342764c059045df7b47882a77d96ceb261898
sheet-spreadsheet-lowercase = hoja de cálculo
# en: 7e53821f70ae16079c4a6a64c52a91fae645bc5f
common-numbers = Números
# en: 05634091c29d83162cee95ca003dc222a3bab8ea
sheet-spreadsheet-with-formulas-named-cells = Una hoja de cálculo con fórmulas, celdas con nombre y gráficos; tres columnas para empezar, más cuando las necesites.
# en: 7aeba4cd15b1afc5015285c0854f0edae2380d36
sheet-budget = Presupuesto
# en: d99860b75cc866415325dd845f03e65f1b9fc648
sheet-planned-against-actual-line-each = Lo previsto frente a lo real, una fila para cada cosa, con la diferencia y los totales.
# en: 0a0a7c3be7656f55cd259d558c2d0eb59b893b88
sheet-expense-log = Registro de gastos
# en: c2effbb05c6382e67befb796de9be3ad264a1cbb
sheet-date-what-how-much-which = Fecha, qué, cuánto, de qué tipo; un total acumulado al pie.
# en: a2d841e763d975477b0e1a51d15e6f25c9023d4a
sheet-training-log = Registro de entrenamiento
# en: d5b29b7fbac7da4d79a420a8108f0c98bb1ab61a
sheet-what-you-did-and-how = Lo que hiciste y cuánto, una fila cada vez; un total por cada tipo de cosa.
# en: 4d89a20e90ff128c4329c067414e272156b4b196
sheet-project-tracker = Seguimiento de proyecto
# en: a9f287fb1ede11b35e739a207cac5eddcfd2116d
sheet-tasks-with-owners-start-and = Tareas con responsables, fechas de inicio y entrega contadas desde hoy, días de cada una, cómo va cada una, y una marca al terminar.
# en: 83c8cb0557f1a8ab76094b2801ae0b4cd23e4741
sheet-loans-compared = Préstamos comparados
# en: 8ae3fb1476eab673ec96c9e2614cad18cbd6f497
sheet-amount-rate-and-years-for = Importe, tasa y años de cada préstamo; la cuota mensual (PMT), lo que cuesta en total y los intereses.
# en: 53f4e4eb1a489c6a14658993062fc985a80bd775
sheet-subscription-business = Un negocio de suscripción
# en: f14ffb32b12ec6d73e3971054ddf5248de50852a
sheet-visitors-who-sign-up-pay = Visitantes que se registran, pagan y se quedan: un modelo de flujos, con los supuestos al lado para cambiarlos.
# en: 2f6636a8892aa5d7f9781b630c2131dc8652a7f1
sheet-cafe = Una cafetería
# en: ce157b2ac144f603ec936234eb69d9d524c3354f
sheet-customers-day-what-they-spend = Clientes al día, lo que gastan y adónde va la recaudación del mes: suministros, alquiler, sueldos, beneficio.
# en: 27f8244e11467491805da5dcaace666e1176df07
sheet-freelancer = Un freelance
# en: c7da5aec39e9bdd23c061f2f34a9ecb65f9f20a2
sheet-hours-rate-and-weeks-make = Horas, tarifa y semanas dan las facturas del año; se restan gastos e impuestos; lo que queda es lo que te llevas a casa.
# en: 53ca3d56131df7985cdd58b24a369278bce0d723
sheet-mutual-aid-fund = Un fondo de ayuda mutua
# en: 4df80f44a8c21f77f84393546555c9ab3224fe85
sheet-monthly-donors-and-one-off = Donantes mensuales y donaciones puntuales llenan el fondo; de él salen las ayudas, un poco de administración y una reserva.
# en: 992dbb972d7850082f91f3f43d7b68391091a32e
sheet-month-by-month-with-chart = Mes a mes, con un gráfico
# en: 876c69fa93189c4e89f57aeec964d0573e61be81
sheet-this-year-against-last-line = Este año frente al pasado, una fila por mes, en un gráfico de líneas.
# en: 467dda8775e7e01a3dacd9ff5d247da7caf931d3
sheet-household-budget-by-month = Presupuesto del hogar por meses
# en: f61119c5b20c1ed2360f6aa2b583872a1fc9c474
sheet-six-months-of-homes-bills = Seis meses de facturas y gastos de una casa, una columna por mes, sumados en ambos sentidos frente al sueldo.
# en: 2c2609efcdcac42f94b3d73758d40d3f2f79dfd8
sheet-savings-goal = Meta de ahorro
# en: 49ff61e9d2d6e99106df2e02e7a626aa5186c112
sheet-what-went-in-each-month = Lo que entró cada mes, lo ahorrado hasta ahora y lo que falta, con la meta al lado para cambiarla.
# en: ca1ec97c50f7647ef3588d5de58af33939c01646
sheet-habit-tracker = Control de hábitos
# en: 7a2638dee7c38146953a64566dbd8fc8ea77d8d4
sheet-four-habits-checked-off-day = Cuatro hábitos marcados día a día durante dos semanas; qué parte de cada día se cumplió y cuántos días cada uno.
# en: d80f6ec7eac0c80248e2c7b452e21f89673449f2
sheet-reading-list = Lista de lectura
# en: c809293d68f1061cf7062072d2efc8fe95fe9262
sheet-books-read-being-read-and = Libros leídos, en lectura y siguientes, con los días que llevó cada uno y las páginas leídas este año.
# en: 6e14850d9abea09c879f881a4773537f91cf2ac2
sheet-workout-log = Registro de ejercicio
# en: b2a1db48bce10aa5ac4b8eb894555098ecbaac30
sheet-sets-reps-and-weight-for = Series, repeticiones y peso de cada ejercicio, el volumen calculado, y cómo se sintió cada uno.
# en: 5be9810c81e208adc153f7aa0cc70f64c988d737
sheet-time-sheet = Hoja de horas
# en: df9c77cdd1cdf96f00633ef7f822543a7185dbc6
sheet-weeks-hours-by-client-and = Las horas de una semana por cliente y tarea; las facturables con su tarifa, y los totales.
# en: da7a3e11a9c1686127720177adfd2bbfed7224e0
sheet-trip-costs-split = Gastos de viaje repartidos
# en: bcc455f94ab37c41dad441a4152ac7961c3118ad
sheet-who-paid-for-what-on = Quién pagó qué en un viaje de cuatro; la parte justa de cada uno y lo que debe cada uno (en negativo, dinero a recibir).
# en: 3fcd3bd6c3c0517dc23b7c9c8a424a6ba7c30c9a
sheet-schedule-with-dates = Cronograma con fechas
# en: 9cfdf52e38ee970ebd6feac438c7d2cb6abd25c5
sheet-job-in-steps-each-starting = Un trabajo en pasos, cada uno empieza cuando acaba el anterior: quién, cuántos días, la fecha de fin y los días laborables.
# en: 2a3b772f6e347425b5a235a2e956004ed5177213
sheet-grade-book = Libro de calificaciones
# en: 0e6fce40b16529c27d306da8834f33a391a5ca5b
sheet-classs-grades-for-essays-quizzes = Las notas de una clase en redacciones, pruebas y un proyecto; la media y la letra de cada alumno, y la media de la clase.
# en: 7d9ac107a69e997e571bd6906b535f6802bc5569
sheet-membership-roll = Registro de socios
# en: 3bc0a32ca3d296ee9217f44adf3cf4d3c3dbd080
sheet-who-belongs-their-plot-and = Quién es socio, su parcela y tarea, cuándo pagó y cuándo renueva, quién tiene llave, y las cuotas cobradas.
# en: b884fda377a19ce445f8ec49bd90f2784834978c
sheet-seating-count = Recuento de asientos
# en: 4e00db4efd970061e8ff6cd63f723c7385ad1637
sheet-tables-for-wedding-seats-guests = Mesas para una boda: plazas, invitados, sitios libres y menús elegidos, con una comprobación de que los menús suman.
# en: 8a535a1def73648a0a55a9bfa21c9d370e434ce5
sheet-poll-results = Resultados de una encuesta
# en: df60ac32ce5b04bf11e53f97d296db53c2a2cda2
sheet-answers-and-votes-for-each = Las respuestas y los votos de cada una, dibujados como un gráfico circular encima.
# en: bfee938677dd9bf5dab2de4f9558c07a06d616fd
sheet-fundraising-thermometer = Termómetro de recaudación
# en: f6873b16e788104f3e409c1c06243db77d2a6e04
sheet-what-has-come-in-week = Lo recibido, semana a semana, frente a la meta: un gráfico arriba, el total hasta ahora en grande.
# en: 20ded69e290360ef0be6b1fd22e648ca398d7ed3
sheet-invoice-ledger = Libro de facturas
# en: 2404f6c1a633f188d6395d7b35f7dd1486c597b6
sheet-every-invoice-sent-when-to = Cada factura enviada: cuándo, a quién, por cuánto, cuándo se pagó, lo que aún se debe y cuánto se retrasa.
# en: 300d29fd5f327e8c7a0f4614d4125d93570eeeff
sheet-inventory = Inventario
# en: cca3ceb6d79e8c2e922aa21c8675223c1b96c275
sheet-stock-on-hand-against-point = Existencias frente al punto de reposición; qué pedir, cuánto vale, y un aviso cuando queda poco.
# en: ba8d2875e56e1ee2a745057f4de807182be4bb9b
sheet-petty-cash = Caja chica
# en: 8c7a0a9d0703152466c522d2d8bbd55cfcea218d
sheet-money-in-and-out-of = Dinero que entra y sale de la caja, quién lo gastó y en qué, el saldo tras cada movimiento y una marca por el recibo.
# en: dca1686c53daf52f46495f2a961a3346006e41ac
sheet-rate-card = Tarifario
# en: 1a3c8694038b9c6d56a26e131d62c3616e165a77
sheet-freelancers-services-with-hours-each = Los servicios de un freelance con las horas de cada uno; precios y precios urgentes calculados con una sola tarifa por hora.
# en: b9d1a465f75615e0b55ff620ec057c608971b8ed
sheet-mortgages-compared = Hipotecas comparadas
# en: 43ecdf4a244c2e1c022c6c08a3ba1c07f107ece3
sheet-four-offers-on-one-house = Cuatro ofertas para una casa: el préstamo tras el pago inicial, la cuota mensual, el total con impuestos y los intereses.
# en: 54695e5df6ef00663252186d998a600f9bac4c58
sheet-unit-converter = Conversor de unidades
# en: d2e0c086c77046805d1cc8934044bb315bf00aec
sheet-miles-and-kilometers-pounds-and = Millas y kilómetros, libras y kilogramos, temperaturas del horno, tazas y galones: escribe una cantidad y lee la otra unidad.
# en: 9d2911edf283fc08872808d554a1017460fbe86f
sheet-tournament-bracket = Cuadro de torneo
# en: ad907a82b59f9d64761c80d6b2fe13c2a3b04fc2
sheet-eight-teams-single-elimination-each = Ocho equipos, eliminación directa: el marcador de cada partido, el ganador calculado y los ganadores que pasan a la final.
# same
# en: 0e2d6a433d926deb1903e03f166c76cd50bd542d
sheet-excel-xlsx = Excel (XLSX)
# same
# en: 3281188351b89c8e2db28d6da7af4992d415de90
common-csv = CSV
# en: 795a4ad3f904388d715a0384382b361f16342610
sheet-chart-svg = Gráfico (SVG)
# en: 3001366084e5b141572a5a7b708f24fc835d2720
sheet-chart-png = Gráfico (PNG)
# en: 492630372c601d63c25590ebdc75ab6f34a2ff74
sheet-empty-sheet = Hoja vacía
# en: 2decd02b722b692c9d30d7de5e0c1191d1968de7
sheet-n-of-max-shown = (se muestran { $n } de { $max })
# en: 9e85be5a97dd107512bd06368b695b4265a662c9
sheet-50-more-rows = 50 filas más
# en: 46dd847f36799647b69659ed71327486c70728ea
common-add-column = Añadir una columna
# en: dff758e7f1104295adde7af1bb92396f6c7c88a7
common-add-column-after = Añadir una columna después
# en: 66c7734789e19cbeef3a5ac185ea732139aed213
sheet-chart = Gráfico
# en: a0e276f06261f873cb144d086a0f3c33941f43f7
sheet-chart-of-table = Gráfico de la tabla
# en: 1d66c3d0758e71b315e012814dc35df62cfab9d2
sheet-checkbox = Casilla
# en: 3c5512cb6f54f5f5483d681781a71d95982c8769
sheet-column-after = Columna después
# en: 6d36997d9f52785865f243c2436502c328d12b1f
common-column-c = Columna { $c }
# en: b4a57f5f40871854cb181f17a04c4e72c5c4048a
common-column-c-holds = Tipo de la columna { $c }
# en: b657e2a4e550834ea13d1026bf21694fb9a65c3c
sheet-column-c-type-what-it = Columna { $c }: { $type }. Tipo, ordenar, añadir o quitar
# en: cf723c59b62a173547c39c3d661c4ee7c240bab1
common-columns = Columnas
# en: 40c14f884fe7e5b4e58ea4bd6f6d522bae43134b
common-delete-which = Eliminar { $which }
# en: 51f5ba33dabbc2c8aa4e3e640e0b27cb55aea1be
common-drag-to-fill = Arrastra para rellenar
# en: 87b8f44339c3a345782b1fa838bfa3b0406567b3
sheet-abc-or-123-for-this = Tipo de columna
# en: 69ff8ba19299f697ed3f5401bb7c03f0abbc4c67
sheet-drag-to-resize-double-click = Arrastra para cambiar el tamaño, doble clic para ajustar
# en: 363a9922cf56c76397d7b72ae8425d30d0438b33
sheet-fill-down-from-top-row = Rellenar hacia abajo desde la fila superior
# en: 549a401f55bc461388a4f5f8554db5e0749d0a28
sheet-fill-right-from-first-column = Rellenar hacia la derecha desde la primera columna
# en: 51f5ba33dabbc2c8aa4e3e640e0b27cb55aea1be
common-fill-drag-to-carry-these = Arrastra para rellenar
# en: 4425eb9442fea0435d290b7a34f1ad8a6980e789
sheet-fit-columns-to-page = Ajustar las columnas a la página
# en: 720f58fb1f9353ab3c904b888ccb774c40393e06
sheet-formula = Fórmula
# en: f1e410ad1472b42cb42cc98962428637290b6706
sheet-function = Función
# en: 4c0ab96e8dd44e528589261be865f136fcbae564
sheet-high-to-low = De mayor a menor
# en: 22c03da74b04607929f25258870ac2571a1b46bf
common-insert-n-rows-above = Insertar { $n ->
        [one] una fila
        [many] { $n } de filas
       *[other] { $n } filas
    } arriba
# en: 5e3141f35e5d110b9f6303876cf866971f689046
common-insert-n-rows-below = Insertar { $n ->
        [one] una fila
        [many] { $n } de filas
       *[other] { $n } filas
    } abajo
# en: ae3b3fa65ff4f34adbaf5d76e694293bb2059fbf
sheet-letters-keyboard = Teclado de letras
# en: 7177342b32d961e7d51feb4571231982a48a0772
sheet-lock-these-cells-so-reader = Bloquear estas celdas para que los lectores no puedan cambiarlas
# en: 893190219ca26f4bad6f2395b91da6295cab23b6
sheet-locked-part-of-model = Bloqueado: parte de las fórmulas del modelo
# en: b1b588e8ffba9c37d560f4b4d63c6344d009ce2e
sheet-low-to-high = De menor a mayor
# en: 1dc043bb8eb5646851ff808477bb5d3573739f1c
sheet-money = Dinero
# en: 709a23220f2c3d64d1e1d6d18c4d5280f8d82fca
common-name = Nombre
# en: 3f37ebdc04c6216818bd5bbf8724175546a880c8
common-name-of-column-c = Nombre de la columna { $c }
# en: c103a2458adcf85547000188a915ccb91f45ee9c
sheet-names-cell-to-its-right = Nombre para la celda de la derecha
# A money column's currency (Money picked in a column's menu): the field's hint, and what it says of words it cannot read.
# en: d02550533b8780a7e646803c3b7b9cb7a78ba756
sheet-symbol-like-or-code-like = Un símbolo, como $, o un código, como USD. Vacío: la moneda del documento.
# en: 1224b5538c873fc11d856120fedeb76e516529c6
sheet-symbol-of-up-to-three = Un símbolo de hasta tres caracteres, o un código de tres letras.
# en: 630470a61228c20119f270074f1e0b6a4c2d9151
sheet-no-chart = Sin gráfico
# en: b7baa1d40c4ea29afc9098732bffee2a861a6c44
sheet-number = Número
# en: 80838be5576c4b333f764e352ef9e6c5292b2b78
sheet-open-link = Abrir { $link }
# en: 1d6f3ce763f138e0025747a9d3ae7f30efc75531
sheet-opens-when-clicked = Se abre al hacer clic
# en: ac556cf5938d2104533c38103305f6cf60ba245d
sheet-percent = Porcentaje
# en: 4f9fa8ea1af8cde7cca877c50ca723eeadee35dc
common-remove-this-column = Quitar esta columna
# en: 12ee6fe44798c4fe94090bef612f25e903d9cd15
sheet-resize-column-c = Cambiar el tamaño de la columna { $c }
# en: fa84cb8f7793313625378f4a9caa43b1abbf650b
sheet-rich-text = Texto enriquecido
# en: 45c89f220501dfd15e267bf7d636dc7a76526971
sheet-row-above = Fila arriba
# en: 9be9bf4f94705d404df5c715fda96ae93fda7494
sheet-row-below = Fila abajo
# en: 95d5eb6f6a50994282979432eb3c4dc5836db2e2
common-row-n = Fila { $n }
# en: 7d69f57d4baecc18e3e40be8d939c9d2cbc2e2f1
common-row-n-lowercase = fila { $n }
# en: 8fcfbe7f09950cb9105bd4280c43ee2524090dcf
common-row-n-insert-or-delete = Fila { $n }: insertar o eliminar filas
# en: 767a59f7f0079a019b266853b864269f92d10d82
common-rows-b = filas { $a }–{ $b }
# en: b92fe41ac34453cd0368f0fa5d00d1e9b0279c12
sheet-selected-cells = Celdas seleccionadas
# en: 26b30f90bad8aab892824738a0dc60bd11d082be
sheet-show-all-text = Mostrar todo el texto
# en: 9580fcbce0c31ceaa47eb583e5f7ce637fdc8a0a
sheet-shown-as-typed = Texto sin formato
# en: a2a5bdeca9391be1e0cdff1c19895bae7fadc2c2
sheet-sort-rows-by-it = Ordenar por
# en: ff87bd67a9f3709f0a4247baa8ba4de4a5bd5fd2
sheet-suggested = sugerido
# en: eda0b8f3c389658a7369166fd4c36099e380adff
sheet-is-as-wide-as-it = La hoja ya tiene el máximo de 26 columnas.
# en: 0f54b98f336606a21f0bcbdc77afa4474b2b1966
sheet-is-full-its-last-rows = No se pueden añadir filas: las últimas filas no están vacías.
# en: 7a74dff615ee3bcbc90d8c31886f01082413c776
sheet-three-at-least = Mínimo 3
# en: c97ecbf8fed8c8a3a0d51412e2e9bd4c8539ba26
sheet-unlock-these-cells = Desbloquear estas celdas
# en: 7e592be640ccac5b2bdf24df5b74d19326b5094a
sheet-what-it-holds-sort-columns = Tipo, ordenar, columnas
# The Spreadsheet: any column removed, the Option column, rich cells, a chart put in from Insert.
# en: 63362bbc585e9e03cbf63abe945bcf99aa4d8cc5
sheet-keeps-one-column = Una hoja necesita al menos una columna
# en: 7208e66f41dd004e736a1840e2a99d288a4c2060
sheet-choices = Opciones
# en: 38b6d89278519f90efb25eb841096bc63d9095e0
sheet-choices-for-ref = Opciones para { $ref }
# en: a871e2c9206cb4854cc06c30bc6de95cb82f9700
sheet-has-one = La hoja ya tiene un gráfico
# en: f0dfb92a1f16391ab3bd5478ce9d8c0f2d74bf95
sheet-edit-cell-caret-at-its = Editar la celda con el cursor al final
# en: 28d1a54d2e35ad87c0d19942f68d70ddbf67bcee
sheet-put-back-what-cell-held = Restaurar el valor de la celda
# en: 2b69414b3787eaa8a38f2f1a9c4a48aff7dd78a5
sheet-put-dated-rows-on-calendar = Poner las filas con fecha en un calendario

## downloads: hand-offs to another app (kit/file/exports.ts)

# en: f03b6f674b16abfbc970946d0781228b3407655e
export-open-in = Abrir en
# en: 7f7b61c3d0574fa0bae27972834652c8b6f222e6
export-pdf-file = Archivo PDF
# en: 20ab05206208a4e9bea088d36c6640c781c6bf65
export-copy-link-that-downloads-ext = Copiar un enlace que descarga el .{ $ext }
# en: 389a8e30f70f547f507d418d67a8048c7eb2eda4
export-could-not-share-ext = No se pudo compartir el .{ $ext }
# en: 5869a7d435c371c52a7c02fe623f625c5062ba1c
export-could-not-show-ext = No se pudo mostrar el .{ $ext }
# en: b31bab5111d8c6e8c5b51deffa133f4e7063ec37
export-download-ext = Descargar el .{ $ext }
# en: 6d92cb44456263f51e52b62171b3602b54c5fec0
export-share-ext = Compartir el .{ $ext }…
# en: f9b579ae7d7104f25e1800d18a5b3e89343618cb
export-view-ext = Ver el .{ $ext }

## the icon library (kit/ui/icons-picker.ts)

# en: 716f63b96e0c263222949a3b8a00cdb4f46d3183
common-icon = Icono
# en: 07b3e447db02b7cc20a78a57c316febae22ed72b
icons-favorites = Favoritos
# en: a8b63bb6a000ce6560e6126bf0fade0a56fef128
icons-search-icons = Buscar iconos
# en: 7fcd8d44c6f295423534073543e6050ddd8cf497
icons-suggested = Sugeridos
# en: edb8f6c14252759cd8673c61a24376d32e17b93a
common-icons = Iconos
# en: 7d9b3876b6aa451cf6a99a0323e97ba79d6a4a27
icons-no-icons-match-q = Ningún icono coincide con «{ $q }».
# en: 213898967018ae7e0c3b4bf96e59877f9d434ca7
icons-search-by-name-or-by = Busca por nombre o por lo que significa («dinero», «tiempo», «ia») para encontrar cualquiera de los { $n } iconos.
# en: 95553ba8a4056a6f9817d2dbbf0be4c66d9eacd7
icons-no-icon = Sin icono
# en: 1935c7dc9183bd8f7d4987f70ff5592b29d45397
common-icon-or-emoji = Icono o emoji
# en: b37554f695b15005fd23907b9488e0a8ad4bca5f
common-people = Personas
# en: 1699cec34f8ca2d63e0b366fc1fe83d5de3a0c13
icons-search-icons-and-emoji = Buscar iconos y emojis
# en: da588993ff27cbb60e3c1cecefb192d389748ef0
icons-or-emoji = Iconos o emojis
# same
# en: 5090a9e78c899272a10648b39e7689bc40072825
icons-emoji = Emoji
# en: d30201283cf13108c4beeb8c7c1787e5cda37590
icons-no-icons-or-emoji-match = Ningún icono ni emoji coincide con «{ $q }».
# Unicode's emoji groups, as the picker's Emoji set names them.
# en: d883a36d4ea749e2946b208450185bccfbca11c2
icons-smileys-emotion = Emoticonos y emociones
# en: 45f4db9fab3599be7af02e3a58af52988789725d
icons-people-body = Personas y cuerpo
# en: fee7d0c1beea3c67c9a835315496da822a22e839
icons-animals-nature = Animales y naturaleza
# en: a9704a2ad9afea5f9d4d1504458f91e253557264
icons-food-drink = Comida y bebida
# en: 4cea7e0a28a73fafbe052e8132f1c86cd07a68ed
icons-travel-places = Viajes y lugares
# en: e58f7f889902c81b8879128fede278022f0e459c
icons-activities = Actividades
# en: 72a83add2c5ede877c10d23f302d3e17accbadab
icons-objects = Objetos
# en: 22ad664e9eb98b75a73333b2b2395fc4b52e6fc9
icons-symbols = Símbolos
# en: 5d728758adcdd5154d3be55552c1c061ef1489b2
icons-flags = Banderas

## the Drawing Tool

# The group heading the Drawing Tool sits under on the home page: Design. 'Draw' is the Animator's mode for drawing.
# en: bfa50c7a3838fc883b8f4fd701b280e77a3952ea
draw-draw = Dibujar
# en: 51c99e5a9ce98b2b6990b55b10a46d2fd23a18f1
common-drawing-tool = Herramienta de dibujo
# en: f4f99578c04e974810cdd12ceb7ae902de7291d3
draw-drawing = dibujo
# en: 59b035367211a9382930b2a4c13637dbc33c4f32
common-design = Diseño
# en: 0077c4c9a2bcb4318b7a85a034bc75912afc3cb5
draw-boxes-arrows-icons-and-labels = Cuadros, flechas, iconos y etiquetas sobre una cuadrícula; o pixel art, que puede convertirse en un mosaico de fondo.
# en: b807ee7758852c19e577610f2c56bf3ee0fb29bb
draw-request-flow = Flujo de una petición
# en: 00cbc89498c2f280038a754777730896717e8071
draw-browser-asks-server-which-reads = Un navegador pide a un servidor, que lee los datos: cuadros unidos por flechas.
# en: 0b2cbbcb4742328b0a7288f1b69223de737b2d15
draw-flowchart = Diagrama de flujo
# en: f7a7e4b122a1c6db709d59b923a8e915ae67c9b3
draw-three-tiers = Tres capas
# en: 8d884dc3538d977a76ea897e377b897d4b3cdc0c
draw-phone-and-laptop-api-database = Teléfono y portátil, una API, una base de datos y una caché: un sistema dibujado con iconos y uniones.
# en: d5786d3d397a91b189e23529401c4f8d35cd09b0
draw-floor-plan = Plano de planta
# en: fddd68346c75bb66ad003c667e573feb965f7ca4
draw-one-bedroom-apartment-from-above = Un apartamento de un dormitorio visto desde arriba: habitaciones como rectángulos, con etiquetas, y las puertas como huecos.
# en: 38a0d171dc9e21d8e32aacfbb8a170dad9977d9c
draw-pixel-heart = Corazón de píxeles
# en: 7f51a7b112b9965b1cf5d78f9b43f76de5ad8f0d
draw-16-by-16-heart-in = Un corazón de 16 por 16 en píxeles, para colorear o para empezar de cero.
# en: c65ee0720b3ba1dac7268415c7c987faabecc4a8
draw-background-tile = Mosaico de fondo
# en: e78fb3ca7b230e0df30391c85eec105bf55656bd
draw-8-by-8-pattern-that = Un patrón de 8 por 8 que se repite: úsalo como fondo de un dibujo, o de cualquier página.
# en: 99cb45a6f4e975a5a7be78811422b5933dd6598b
draw-card-for-ninetieth-tilted-on = Una tarjeta para un cumpleaños de noventa, inclinada sobre un fondo de confeti: letras grandes, flores, cariño de todos.
# en: 2020c98a00da0ecd8574350e226b7d4c448a451f
draw-phone-screen-sketched-in-boxes = La pantalla de un teléfono esbozada con cuadros antes de que nadie la construya, con notas de por qué está cada parte.
# en: 106c289912d69f2f02f64b1c195daa945a29c19f
draw-rosette-with-ribbons-for-volunteer = Una escarapela con cintas para el voluntario del año, para imprimir, recortar y prender.
# en: c9c7469b74c0a43646cb4a46279d9930b271ca19
draw-block-party-from-above-stage = Una fiesta en la calle vista desde arriba: el escenario, los puestos, primeros auxilios y dónde encontrarse si te pierdes.
# en: 6d12c8adbefeaeacac0d48274df3a195ca9a1d17
draw-badge = Insignia
# en: 32787c0201e95e7dd6ca00aa5dd63210e278e3db
common-birthday-card = Tarjeta de cumpleaños
# en: be3883124104a86065f65c46fcf4edff20e0842f
draw-can-we-refund-it-stores = ¿Podemos reembolsarlo? La política de devoluciones de una tienda en preguntas, respuestas y qué hacer.
# en: 619a6e052e5343b8fbad2bfbc5a35d0aa4ec763f
draw-event-map = Mapa del evento
# en: 6349ac251c1b86c4744c7e0361a5e72ea5e38402
draw-four-16-by-16-icons = Cuatro iconos de 16 por 16 en una cuadrícula, sol, nube, lluvia y tormenta, para copiar en un pronóstico o un botón.
# en: 9c6396f6f0d3ea9cb4720d61fecd3ede243d72c8
draw-game-sprite = Sprite de juego
# en: 8752fbad4e546cb5ffe343544f280f98fc20d43f
draw-logo-sketch = Boceto de logotipo
# en: 26dbc52edd1d138f4ab006d860b56dee54bf919f
draw-order-to-doorstep = Del pedido a tu puerta
# en: 9bdb2a0b447519986c24ccc21eaf68976587c9fc
draw-pip-frog-32-by-32 = Pip, la rana, un héroe de 32 por 32 con bufanda roja, perfilado y listo para animar.
# en: d8cca3dd62ad1e4c37a8b10c054464bbcb13e3c9
draw-room-plan = Plano de una sala
# en: fcba7b3fe14a456c5dd428b4e0b28552efa25751
draw-living-room-rearranged-sofa-rug = La sala de estar reorganizada: sofá, alfombra, estantería y escritorio a escala, con el giro de la puerta dibujado.
# en: 8640aa92343372c68f5d72660821c342598d8b38
draw-three-ideas-for-coffee-roasters = Tres ideas para la marca de un tostador de café, una junto a otra, con el nombre en grande, y una fecha para elegir.
# en: 68224d905ee1bc5c63082121b1e80cf6fe7d08c1
draw-weather-icons = Iconos del tiempo
# en: 0d07d8bcde49fe88082ab75f75e2fd49bbcef253
draw-what-happens-to-package-from = Lo que pasa con un paquete desde que se compra: un proceso en pasos, con iconos y uniones.
# en: a5be156d0e860e683861363db9d3c32c664ca943
draw-wireframe = Maqueta
# en: 3e8785ece820edb3b53646af4cc1d4e3d40e13cb
common-picture-svg = Imagen (SVG)
# en: 833ba107dc3d58db8b9f35a717d7bd43c83a0817
draw-background-tile-svg = Mosaico de fondo (SVG)
# en: 34f2e94dc9cb747e7afc204c645943fa3ab68196
draw-background-tile-png = Mosaico de fondo (PNG)
# en: 75f5b48c5980dd2997738dd7416aa5fe8ca60e9a
draw-animate-this-drawing = Animar este dibujo
# en: a42ec2578a2a55cc28dcfbd53e3c34dee5d31d78
draw-drawing-of-things = Un dibujo de { $things }.
# en: 2759692cb0d64c0c370b6516074bb1de744a31a2
draw-drawing-of-n-unlabeled-shapes = Un dibujo de { $n ->
        [one] una forma sin etiqueta
        [many] { $n } de formas sin etiqueta
       *[other] { $n } formas sin etiqueta
    }.
# en: f33cdbb01b5b65fe3fe8928669d13ca09b3b5403
draw-leads-to-b = { $a } lleva a { $b }
# en: b9e37b62382792094f5463a54183d523118a25a0
draw-joins-b = { $a } se une a { $b }
# en: e0883468badf6a5f9c1cfe0ce209a16939a64683
draw-empty-drawing = Un dibujo vacío
# en: 1f9c4a5ed21a39ed45db86eb13cbff389eede2cf
draw-pixel-art-n-by-n-filled-squares-filled = Pixel art, { $n } por { $n }: { $filled ->
        [one] un cuadrado relleno
        [many] { $filled } de cuadrados rellenos
       *[other] { $filled } cuadrados rellenos
    }.
# en: 2aafc8e9796ba5ac5ccffa1800cf6c5ba65250fb
draw-pixel-art-n-by-n = Pixel art, { $n } por { $n }
# en: 8598222918d3c6e513d63060cf55e2971ded729a
draw-select = Seleccionar
# en: c158695a64adb40952c1cf9fde78b62bd6147f42
draw-rectangle = Rectángulo
# en: 8580e3175f4eb7461a5fac359ee86cd4c559d555
draw-ellipse = Elipse
# en: b3850e04b5cc10929206d2336efa79a041358d57
draw-diamond = Rombo
# en: ea9676003762818513c636984faeaa0ae356839a
draw-line = Línea
# en: 3a4758c3cc8dac2d76026d0733816741f9b21d43
draw-arrow = Flecha
# en: 24421a551f456e8f5bde7180378b590f0337c041
draw-join-two-shapes = Unir dos formas
# en: cf6c07e7054fad4d6a8affaf62f285e16525c46e
draw-pen = Pluma
# en: c72e323a57434ede3b6eb0cc235109eb76833c55
draw-any-shape-tap-for-each = Polígono: toca cada esquina
# en: 016a5405a0b425e7d1ac65317df59b45ce5fb1f5
draw-freehand = A mano alzada
# en: 8a48ec1f6c073fad0326a0e9251a18e4c88660b5
draw-drag-to-draw-line-or = Arrastra para dibujar una línea o una forma
# en: dcd096d38fc0be24bd96ac76246e98341b853208
draw-rounded-box = Cuadro redondeado
# en: 08596d60c57fd87e530cbdd2a06052b06d8c4137
draw-hexagon = Hexágono
# en: b116d77a368034d3de6ca1dc0414de7dfd49400b
draw-parallelogram = Paralelogramo
# en: 817b354dc01a34895eab0c37e21af38dc0850d08
draw-cylinder = Cilindro
# en: 2c924e3088204ee77ba681f72be3444357932fca
common-note = Nota
# en: b406fb57b29fc76f71864fbb37f0238045f84d9d
common-black = Negro
# en: cc9db3a795571c7e71f45670a1da7ff49b5f1557
common-red = Rojo
# en: 09fb6aaba7940a7b7ffdbc9cbb9b3498303c1bad
common-orange = Naranja
# en: 933bf21afdd55a0d2283845fed0e7bbdd1f5db49
common-green = Verde
# en: 7d44bc449c2a26374800a503f10f3d8949505f40
common-blue = Azul
# en: 32576f4fedc07f63020353af6a8aac66c4452c4c
common-purple = Morado
# en: 3b4e294693563cc45de95b9db8b4abeabfac77db
common-indigo = Índigo
# en: 3526f607bcd4f51ad0bc05f814579a42c2c0ba57
common-yellow = Amarillo
# en: b3d97fd6dece388a968e367f3ac4b9e64d739f52
draw-sky = Cielo
# en: 54076359fdc7f1f0e000b9ae15b96f8b09866acb
draw-pink = Rosa
# en: 168cbb2ea52b9e34d271accecfa7d7951e948a99
draw-clear = transparente
# en: b1985e387405e4d4afb40d5dac9b2656f5d6f770
draw-shapes = Formas
# en: 4bab2d8fe13fa6ab57f80098b414f0f734c5dd25
draw-more = Más
# en: 34f9968677e8b728f4405bf338fba32c66bd2a77
draw-icon = Icono…
# en: 64dd60fe1a049fe6db3eb1369dec2e42bf428e21
draw-background = Fondo
# en: e1946387893c804aeadc93e5df5af3416cf1dc53
draw-remove-background-tile = Quitar el fondo
# same
# en: 1d0c8304baedcf8e3a78982c2e7c0b04622bf2a0
draw-color = Color
# en: cfdd099c4751f2f9aef2491f411111906956e0f2
draw-arrange = Ordenar
# en: 8c4e184c7224521ecdb958ef6eb40a05b5171f9a
draw-no-fill = Sin relleno
# en: 7adb6736cf2c9ae017b128f98738ffbae0e58655
draw-fill = Relleno
# en: 1f65ed95fba62cd5b74b58c2ca9ba63448117160
draw-bring-to-front = Traer al frente
# en: e259d4e19e695a41e2f10680f2e3f5693711382a
draw-send-to-back = Enviar al fondo
# en: 972d57379db3e5be76d4ead709fef1ad71ff03d6
common-duplicate = Duplicar
# en: 5301648dcf6b53cefc9ed52999aaa92d4603cae0
common-edit = Editar
# en: f6fdbe48dc54dd86f63097a03bd24094dedd713a
common-delete = Eliminar
# en: d7bc7e98ec7a8acfd61dabe29e1e9156adf86fb9
draw-put-icon-on-this-shape = Poner un icono en esta forma
# en: 33bde816f0f7a53b8de67b8f8d6981f47e28159b
draw-place-icon = Colocar un icono
# en: 4fc05f2763ba31e2d3be5f08e7d0bab5d5dcbf78
common-zoom-in = Acercar
# en: a4ae4b24a1f5369c2bff61abdbc221170e4b27d8
common-zoom-out = Alejar
# same
# en: e30eff925100b7c3e119ed678e39009e962455b0
draw-alt = Alt
# en: f978200b112084eef0c088e1d0075ad2fbca39cf
draw-alt-text = Texto alternativo
# en: 5cb1c64554b7e1dc72e12360f2d04f33dc206b1d
draw-alt-text-alt = Texto alternativo: { $alt }
# en: d039700b1af48db561cd71c056aed2737e8fae32
draw-add-alt-text-describe-this = Añade texto alternativo: describe este dibujo para quien no pueda verlo
# en: 676f1e162fc4f58007821f7c1a55b893e9a04715
draw-what-does-this-drawing-show = ¿Qué muestra este dibujo?
# en: c8636572fb4b9e79bae4c9fef82fc8109961c471
draw-diagram-of = Un diagrama de…
# en: 5a33f2e7e84274a5291191ca3105e62d897eee0e
draw-read-aloud-to-people-who = Se lee en voz alta a quien no pueda verlo, y se guarda con el dibujo dondequiera que se incruste o se descargue.
# en: 988c63b77eade4f718f9d469cb36e35bff976839
draw-describe-from-shapes = Generar a partir de las formas
# en: ac302ae45938c985822f097507602d624128f1d0
draw-tap-or-drag-to-paint = Toca o arrastra para pintar; las flechas mueven, Enter pinta.
# en: ea263dc45b04f2755ac61a51deecc96ade3fb6a9
draw-tap-each-corner-tap-first = Toca cada esquina; toca la primera de nuevo, o pulsa Enter, para cerrarla.
# en: ccdc55c46a79ea604962ddda9cc010311bdca4fe
draw-drag-to-draw-end-where = Arrastra para dibujar; termina donde empezaste para cerrarla en una forma.
# en: ef5a6074bd843b506d359711212e8236802d80c4
draw-press-on-one-shape-and-let-go-on-another = Pulsa sobre una forma y suelta sobre otra.
# en: 1005cc8c1dafc1f9eb422bf2ac68290b492fdfd1
draw-now-other-shape-tap-it = Ahora la otra forma: tócala, o elígela con las flechas y pulsa Enter.
# en: e3686f1c55ec91e31825e1d9510abf592d80b08a
draw-drag-to-move-them-together = Arrastra para moverlas juntas. Shift+toque añade o quita una forma.
# en: eb36764c60ec7a17dd6ac3ec7dbbd22ee401778e
draw-press-on-one-shape-and = Pulsa sobre una forma y suelta sobre otra
# en: 199f4e86afea4f2d42eb40b63ce8599168575e06
draw-tap-where-icon-goes = Toca donde va el icono.
# en: 86da5e24511bad8c1cace935e830c0625b04b607
draw-drag-on-canvas-to-draw = Arrastra sobre el lienzo para dibujarla, o toca para colocar una.
# en: a5742851f0f81d3bdcf184cb2a164390f3e989bb
draw-eraser = Borrador
# en: 5136ae1b5bfe9175a6ed64915e648bdc240443a7
draw-pencil = Lápiz
# en: d60e52fb8066ebf1bf1329750c068e7042c783fd
draw-clear-grid = Vaciar la cuadrícula
# en: 45ecea7c16e725c14cfec68f5b12d1545f222a73
draw-use-as-background = Usar como fondo
# en: 507f52dfd67fb731677bb9ae6971f9b5e891bc84
draw-grid-is-now-background-download = La cuadrícula es ahora el fondo. Descárgala como mosaico, o úsala en cualquier página con tile:.
# en: 209a1a74ee8eec09b861bc34e5ddb08a1357a364
draw-pixel-grid-n-by-n = Cuadrícula de píxeles, { $n } por { $n }. Las flechas mueven; Enter pinta con el color actual.
# en: a9deda2292f9b3c9a827e2aa71e0da6b4db9f16e
draw-row-y-column-x-ink = Fila { $y }, columna { $x }: { $ink }
# en: d316afce8845f59e541c981d07d81bab22858d00
draw-as-repeating-background = Como fondo que se repite
# The contextual bar under a shape, and its words typed on it.
# en: 27bb3dadbebca64cec249a9811a07cd3ea25a520
draw-dashed-line = Línea discontinua
# en: 8953b1fb5c8eeda2158dfd09bde1a766d4b9079d
draw-dotted-line = Línea de puntos
# en: 6597b9e38708468a6ada223bbd324b34dd9b8d23
common-edit-words = Editar texto
# en: 73a03229ad334f953ab9119481b53f881218d015
draw-extra-large-text = Texto extragrande
# en: a489f3e9ff96e710da6f0dad589e2e4f58ba2dde
draw-gray-fill = Relleno gris
# same
# en: d160e0986aca4714714a16f29ec605af90be704d
draw-l = L
# en: d7f442ef62cb3d9ac929d5c992b5daf0ca7721d3
draw-large-text = Texto grande
# same
# en: c63ae6dd4fc9f9dda66970e827d13f7c73fe841c
draw-m = M
# en: 3142905be6683e711043cf1317f0beb5a495ee4b
draw-medium-text = Texto mediano
# same
# en: 02aa629c8b16cd17a44f3a0efec2feed43937642
draw-s = S
# en: 11cc69c6f994eeb6dd90a55a7ce3bbc682544f87
draw-small-text = Texto pequeño
# en: 6e9a379022a3fda2be5039485a0a092130c73f70
draw-solid-fill = Relleno sólido
# en: dcfb9c041348e0d62c058f37225ad2185472edc8
draw-solid-line = Línea continua
# en: b233a397b799e80f21b88a34ae7e30af0528d1c1
draw-shape-in-hand = Forma seleccionada
# en: 6be4ddf808de37e8c50aae4f621dd09b03f5a4e6
draw-words-of-shape = Texto de la forma
# en: 1737205dd1aad709dc2209b2e892ffb8c4de0fc8
draw-type-words-enter-is-done = Escribe el texto. Enter termina, Shift+Enter añade una línea, Escape cancela.
# same
# en: a2f9d0d16d02a20ef369e6029d9e5929c3d70d3e
draw-xl = XL

# en: aba6eb7da15924b741fdff98ff19be9915cd84f1
draw-drag-to-move-corner-handle = Arrastra para mover. El tirador de la esquina cambia el tamaño, el redondo gira. Enter o un doble toque edita el texto.
# en: 9cacab39109399036915a6b67336853e622472cd
draw-drawing-canvas-v-selects-r = Lienzo de dibujo. V selecciona; R, E, D, L, A, T dibujan; las flechas mueven un poco; [ y ] giran; Enter edita el texto; Supr elimina.
# en: 4421c5912fa5d727f23883b0a69028e195e3717b
draw-tap-shape-to-select-it = Toca una forma para seleccionarla, o arrastra alrededor de varias. Elige una herramienta para dibujar.
# en: 6f72f3cd1255e9bb344a1f9adb5fc64770f07cd5
draw-rotate-left = Girar a la izquierda
# en: b75f23d1d0e44603289911e22ad5efd66157913a
draw-rotate-right = Girar a la derecha
# en: 4e41a56fa9e8996a27760c0b9c78c126b0892d19
draw-pixels-n-n = Píxeles { $n }×{ $n }
# en: 6469ebd3a4fdb9e64f402eed612d2bfc0e0bf746
draw-align-center = Alinear: centro
# en: b25d3dd496584e2c6258aa9c77cc555dfd5988a4
draw-align-left = Alinear: izquierda
# en: e65f83bdf0bfbca6e0efd3f75baa155ab6652113
draw-align-right = Alinear: derecha

## the Animator

# en: a6b8b600c27ce95ddcf867cfc503564c89fe816a
anim-animation = animación
# The templates: what each motion is, in a line.
# en: ec026663a7e4c23dd850c7f5a96deef71bf8bb81
anim-lift-off = Despegue
# en: 5d15aaf0784e98385ffc925f574edbf1a0657292
anim-rocket-climbs-away-with-its = Un cohete se aleja con su sombra mientras suben las palabras: dos formas, dos fotogramas clave cada una.
# en: 1cc22feeb4a82e33a9fd435fbf7c4a927a0408e1
anim-bouncing-ball = Pelota que rebota
# en: 567b2c86aa06b4d0133474a39dc6545196754a25
anim-ball-falls-faster-and-faster = Una pelota cae cada vez más rápido al suelo mientras su sombra crece bajo ella; reproducida hacia delante y hacia atrás, rebota para siempre.
# en: 7296aa4a483797a1a82ec05a4598688ca056cd36
anim-loading-spinner = Indicador de carga
# en: ccf7f6eb9188fe228da413a1aaf39c5ee4994346
anim-eight-dots-in-ring-each = Ocho puntos en un anillo que se hinchan por turnos, de modo que un punto brillante da vueltas mientras se guarda una página.
# en: 691f884e182237907640c6964bda657a5ffec1c0
anim-title-card = Tarjeta de título
# en: 56d07df6f27b468d9e3456707110962e1da029c6
anim-red-curtains-part-on-opening = Unas cortinas rojas se abren la noche del estreno y el nombre del festival pasa al primer plano: reproducida una vez, se queda en el título.
# en: 1383ce3b8f642f2c5946975ca61e868e4a504819
anim-present-hops-stars-and-hearts = Un regalo da saltitos, estrellas y corazones se mecen a su alrededor, y el saludo brilla en letras de arcoíris.
# en: fad7f01d931894b10da998319cdc82f1a7d7e4dc
anim-quick-standup = Reunión exprés
# en: 79d688c0e9e1f3c402c3d6bedae252cfdd0b27aa
anim-meme-with-caption-above-and = Un meme con un texto arriba y otro abajo, y un reloj que gira y se tambalea entre ambos.
# en: 7e9b34abf6e91127f94374508015ad795c91268b
anim-build-is-green = La compilación está en verde
# en: 2015347d0927e36755702bf7ae8677fa8d565545
anim-meme-in-two-lines-of = Un meme en dos líneas de letra Impact, y un trofeo que entra girando, aterriza y brilla.
# en: 98eb193445404588fd801a26b8383def925748ab
anim-flash-card = Tarjeta de estudio
# en: 864aea3fc448ba5b87612d5e8c4c6dafde49b09a
anim-card-shows-spanish-word-turns = Una tarjeta muestra una palabra en español, se da la vuelta para mostrarla en inglés y vuelve: un giro sobre su eje vertical.
# en: 23015d1cbacca964e41f5cbb0021ed050964a9ed
anim-weather-this-week = El tiempo esta semana
# en: 8dc082991f9eea4f537ecd34d66858c28b08bcb6
anim-four-days-of-weather-in = Cuatro días de tiempo en Lisboa, cada icono con vida: el sol gira, la nube se desplaza, el rayo sacude.
# en: b8224dd56d927c2c68b1498f39b7a2ed20f88c57
anim-new-year-countdown = Cuenta regresiva de Año Nuevo
# en: 6b46f602f1762ee9ef676cfb3d455fba6a9a07df
anim-three-two-one-second-each = Tres, dos, uno, un segundo cada uno, y llega el año nuevo en letras de arcoíris: reproducida una vez, se queda en el saludo.
# en: e004a532912502de514d6c1801dcc60517d6007a
anim-flight-path = Ruta de vuelo
# en: 69049056a83981f31dea9f7350b7356570e735b3
anim-plane-crosses-dotted-route-from = Un avión cruza una ruta de puntos de Nueva York a Lisboa, subiendo a medida que avanza, con los horarios del vuelo arriba.
# en: 7de4868fea7340b1b7e0779ba2e81218c703ab57
anim-neon-sign = Letrero de neón
# en: c0cba8072586f9c04d65da0f16b714c865f261e1
anim-cafes-sign-at-night-name = El letrero de un café de noche: el nombre parpadea, el horario destaca debajo, y la taza brilla y se hincha.
# en: fadf71c7ea92e6416fd6d89969f8e78a115cd3c1
anim-sunrise = Amanecer
# en: 672c99d7a4f36fb3de226944eb862e3c9faa5663
anim-sun-comes-up-from-behind = El sol sale tras las colinas y entra la mañana: profundidad, tamaño y un horizonte dibujado a pluma.
# A key is a moment a shape is set at; between keys it travels. The effects (Impact … Blur) are meme looks.
# en: dc6828c6d02be5a4b4480bdf9e7f606c74b5ffd1
anim-animated-gif = GIF animado
# same
# en: c81fe6cce809d8d3f0bacf4a00e1c62251061d39
anim-video-webm = Video (WebM)
# en: e643c3f72a4f8b13abefb3c30793c8dbb2e124d4
anim-animated-svg = SVG animado
# en: 3b906156eac7b4b957d3a83ab79a3846fa2c900f
anim-empty-stage = Un escenario vacío
# same
# en: 64fe85d796d8c2eda594dbc0b7b3452a4a2c444b
anim-3d = 3D
# en: fe12532bd63a2e75713ec69be11e92d48e9db3c8
anim-add-key-here = Añadir fotograma clave
# en: 900aa998d3550d438fc20a414d3938fc3a1630ab
anim-blur = Desenfoque
# en: df0e298e356261439795d0d435ce0ce576604c65
anim-depth = Profundidad
# en: 8f25a859269ca51039632dd6bba28fb061cfb8d4
anim-effects = Efectos
# en: b10a3addcfc5d7372c3a6101402e1f910da21188
anim-frame-n-s-s = Fotograma { $n }, { $s } s
# same
# en: 62036a7016ec20273ff717698fbad321c4ff002b
anim-impact = Impact
# en: 4c0a5de85ac9512b6a503ba785c3f369b5cfbda2
anim-key-at-s-s = Fotograma clave en { $s } s
# en: 74adc5789ce92de7bbb5e3d84a287a1ce6d3e7f5
anim-mirror = Espejo
# en: a7b93d2128e820f861fc8dfccd9f5521e89ad21f
anim-mode = Modo
# en: 987e5e1f455e03766d3ef3740947f4db46336d53
anim-moments = Fotogramas clave
# en: 76cdb950721642b6b8596d36d5a39f7705028b99
anim-move = Mover
# en: 00706b5e9ede7f2fb6145370efd20ef72969df11
anim-neon = Neón
# en: 781961bc81c25697841ecce5d4d9dad9f6b261c6
anim-pause = Pausar
# en: 5d12bd53552cafc41ca6146c04870df2e1574e13
anim-play = Reproducir
# en: fa968bd1155bd76231814d479bf070ed96cca9bb
anim-pixel-art-is-made-in = El pixel art se hace en la Herramienta de dibujo; el Animador mueve formas.
# en: b4a9395d25398654fd5d000e4b82a1d8273339bd
anim-rainbow = Arcoíris
# en: 3d5096b70833fdae355f1ffcf32faf2066123467
anim-remove-this-key = Quitar fotograma clave
# en: aa0e7e86b7aa21e9851b9db8b752998918d2b608
anim-shadow = Sombra
# en: b7152342a267362add3c0d7f69f720f7a9c76c9e
common-size = Tamaño
# en: 4a6c11ab8104f8bcbb26155a8f68688d181f8a4b
anim-spin = Girar
# en: 598549d7818087a7d04d49a7b9c00979c8a35c96
anim-stage-alt-arrow-keys-move = Escenario: { $alt }. Las flechas mueven la forma seleccionada (o el tiempo). Coma y punto avanzan un fotograma. Espacio reproduce. K añade un fotograma clave.
# en: a4277f79218220e03e7d4ebb5b1417cbdff137dc
anim-shapes-in-hand = Formas seleccionadas
# en: 6c82e6dd86807ee3db07e3c82bec1ae1ce00b08b
anim-time = Tiempo
# en: 4ad8d1291a5b6b81cd03b1408570e1aae781c074
anim-wobble = Tambaleo
# en: ac906b0770d1cc5e8330907f0063ba444eb3cf5b
anim-now-s-of-all-s = { $now } s de { $all } s
# en: c7f73bb54d928922c3838bb789ee9fb8a5b1eb37
anim-settings = Ajustes
# en: 89798935dfbced66a46a24ee534e23bbf5281faf
anim-this-frame = Fotograma actual
# en: cac09d8898c2435fb48b3b387ff152da7929eab8
anim-duplicate-this-frame = Duplicar este fotograma
# en: 885c46b03eaf682f7c9534f7791ddfc3da84cd6f
anim-frame-earlier = Un fotograma antes
# en: 2c3d7664e236cb8254795d8ffd3761741ccfff7d
anim-frame-later = Un fotograma después
# en: bb4f3c806dbc9e6d5247da5b492939d83c90cf2b
anim-delete-this-frame = Eliminar este fotograma
# en: 406ce96669c44a0f4b79e02af1464b6aa7fbf232
anim-draw-shapes-move-sets-them = Dibuja formas y luego usa Mover para animarlas.
# en: b4d477d39704ecbf21ca422aeebffbad5a519fbb
anim-nothing-here-yet-draw-something = Aún no hay nada: dibuja algo primero.
# en: 00f1eed948284854e29d59b2de928756b7f69388
anim-tap-shape-then-drag-it = Toca una forma y arrástrala adonde va.
# en: e4cabeb67c10b273fc4a1cfba538ac893c850f68
anim-drag-it-to-where-it = Arrástrala adonde va a los { $s } s.

# en: b0d1915925616cc03de525611bfe58839cf5fdff
anim-anything-from-drawing-tool-moving = Cualquier cosa de la Herramienta de dibujo, en movimiento: posición, profundidad, tamaño, giro y vuelta a lo largo del tiempo, con efectos para memes.
# en: 739720909d046c563acd15a980c916ae9b0a75f7
anim-back-and-forth = Ida y vuelta
# en: 7753216f948c789b0cbd5cfb16d1f50c1717383b
anim-forward-then-back = Adelante y atrás
# en: e3e7a3833d19706ebf33b2c3baf8e05deeed7bca
anim-frames = Fotogramas
# en: 0d0b09dfb5d45add0e2f90ec8b193d96ace76d0c
anim-frames-second = Fotogramas por segundo
# en: 3570d228949889218e4c7fdb4ad8c942753530a1
anim-how-large-shape-is-drawn = El tamaño con que se dibuja la forma: 1× es el original.
# en: c028f533678015b6ac2e606a9cafef7e050b11aa
anim-length-speed-and-repeat = Duración, velocidad y repetición
# en: 72f516ede84adba7283e1f7f5fd8eb787c7d33b0
anim-loop-forever = Repetir sin fin
# en: 41b5b25a66d56fd91f645cbe6f83603567c3c480
anim-play-once = Una vez
# en: 368e8081b781aac177fd07c2415b694b1f878911
anim-turn = Vuelta
# en: b2343125992a36aa775f5740930f717a0d1a76d6
anim-turns-shape-about-its-upright = Da la vuelta a la forma sobre su eje vertical, como una tarjeta: de canto a 90°, en espejo más allá.
# en: dbe0717b0567202674ba26238e862ff18b3ffbbc
anim-turns-shape-around-in-plane = Hace girar la forma en el plano del escenario, como una rueda.
# en: df7db1873937e8acd60c26ebf93191ad27b738e6
anim-which-shape-is-in-front = Qué forma está delante: una forma más cercana se dibuja sobre una más lejana, y una lejana un poco más tenue. La profundidad nunca cambia el tamaño.
# en: 2931befb0fbc6bdabcff5b420bf41435e4315548
anim-n-times = { $n } veces
# same
# en: 4a84fdfdafe66c2c85e3e7d7c434de987984470f
anim-s-s = { $s } s
# en: b78baea4121d1dfde75020adb28737da7ea84e59
anim-frame-back-frame-on = Fotograma anterior o siguiente
# en: ad3441e7c85b25bc4c7f46fd051345a6ba241e58
anim-nudge-shapes-in-hand-with = Mover un poco las formas seleccionadas, o avanzar un fotograma
# en: fe13ca0956192777b5060b354cf8e5dc5553c328
anim-play-or-pause = Reproducir o pausar
# en: d3b310dc90b3cc480984236a80101888836acfe9
anim-first-frame-last = Primer o último fotograma

## the Outliner

# The bullet is the line to the parent; a join between any two items is a connection. { $from } and { $to } are items' words.
# en: e8fb468f67bca1564ff499175d1b146c6ccd5d3a
outline-named-label = , llamada «{ $label }»
# en: 02d7116f49a426f4a9dba7a6582ae90478795f7d
outline-book = Un libro
# en: 8f9c05748f1616a4649174a8917da3ee5f3217e5
outline-decision = Una decisión
# en: c35876d5fcc88c6a4c142c7c0e391dda3f92ca08
common-talk = Una charla
# en: 69d33e95f4f69c18d9591a8529f59a6703fc1f85
outline-empty-outline = Un esquema vacío
# en: b972f73739624a697a0aa9bdde4289bafc5b6e4b
outline-outliner-ideas-under-ideas-folded = Un editor de esquemas: ideas bajo ideas, plegadas y desplegadas, movidas y unidas; el mismo árbol que lee una presentación o un mapa mental.
# en: 3d47762769e98192ca611ea7fce028e70e16f174
outline-arrow-from-from-to-to = Flecha de { $from } a { $to }
# en: 081c7d75d7a6b1052f5643338773de8ea68de0dd
outline-arrows-both-ways = Flechas en ambos sentidos
# en: 1e1c0cc8db067d827d10382e4329a748d2e3b54d
outline-as-page = Como página
# en: 16b6e0c696afc500fe76af1de5165a0563e80afc
common-calculator = Calculadora
# en: adab5090ac6a1b7b5420faac7be86c41721ba27c
common-calendar = Calendario
# en: ab732cac31bba434b0b59309a30ce46956dc3d54
outline-cancel-connecting = Cancelar la conexión
# en: 5301648dcf6b53cefc9ed52999aaa92d4603cae0
outline-change-it = Editar
# en: 1ed0b58d18ef647be5de11840bb929ecc8e36446
common-chosen-items = Elementos seleccionados
# en: b65463cb6a42a17de514acc4659f7fd331e0876a
outline-connect = Conectar
# en: f2ea879cf86d5519e3459e15ee70080a4a1306ab
outline-connect-from-words = Conectar desde «{ $words }»
# en: abfb16b3d00afef63f7ed53ad9ababbf2328b5d9
outline-connect-from-to-to = Conectar «{ $from }» con «{ $to }»
# en: 378e916868a3e40a71abc67a748f7faacc94be85
outline-connection-from-from-to-to = Conexión de { $from } a { $to }
# en: 8f3509b64e0ea82c53329cb49a7756bd1ced3566
common-connections = Conexiones
# en: af74f7c5362aaee985bf8cda3dd75fc80751ce51
common-copy = Copiar
# en: 153d7a58b3a3e898fcbdd04c462af308414bd09d
common-comment = Comentar
# en: 849e384559ff16cb2dcddb75cdf0a07437bcc3f9
common-open-this-change = Abrir este cambio
# en: ba97113463234ae7bc314eae6a172572b35b1b71
common-presentation-builder = Creador de presentaciones
# en: 20dcb3b3184067197035f08a5a3955d51fcd94a3
common-diagram-maker = Creador de diagramas
# en: 0d84b3e5992959bf9adbeef94468228a5827605f
common-drag-to-move = Arrastra para mover
# en: 52db9dc3ff903f6d241a91adcbd83848467106c2
outline-draw-as-mind-map = Dibujar como mapa mental
# en: 03683dee41f9db7fad6f8d06c6c6bd776b528ba0
outline-draw-as-network = Dibujar como red
# en: c01d65d48941d40cf0e4bad6bc84c525d99421da
outline-draw-as-org-chart = Dibujar como organigrama
# en: 3159fe421b3221381b3c778dc1c3c26e4540be37
outline-empty = Vacío
# en: 4a66d1480779180159cc25c1c5aa9d760467c6a7
outline-everything = Todo
# en: 9cf188d3a6779d63b36b10275b0228ae22ec97d6
outline-fold = Contraer
# en: ec898362fe9593764e822dd17c78f1f972c20d90
outline-fold-all = Contraer todo
# en: ecdda59aea5ee67d7d854c969ccf7f4f4b4a4c54
outline-item = Elemento
# en: 6f8c7dbc09548197b5d210f514dda19a015102b2
outline-item-n = Elemento { $n }
# en: 120ee44bec923665b04dc825b0307fe159232ce9
outline-kind-of-line = Estilo de línea
# en: 789062517bc27b8cb5c78b1e88041e5bef69b507
common-launch-plan = Plan de lanzamiento
# en: 72eee0aaa10010ae7d362761115dfd7e064dd4d4
outline-line-from-from-to-to = Línea de { $from } a { $to }
# en: 2859ccc92143006360893c2a9cb1aaaa13b3928f
outline-line-named-label-change-it = Línea con la etiqueta «{ $label }»: editar
# en: 52d55422c1936db72f18f5b9e960c2719a3560d7
common-animator = Animador
# en: 260ff8ae7182fc851337b6b2fdb25f8cac2b8d47
common-move-down = Bajar
# en: 8a58f7b7ea514cbdf9bb23a231ad4d03f0cd0ca7
outline-move-this-item-drag-it = Mover este elemento: arrástralo sobre otro
# en: b4f57cd0cd5c7d88461c1718646713dea47a36c9
common-move-up = Subir
# en: 5b2d4bd98ab95d9eae0b3c956cbf98aefe9d7793
outline-name-of-line = Etiqueta de la línea
# en: 3aea913567c437a81d3c153ce49d321f64099651
outline-numbered = Numerada
# en: 89db2d16f087d4e687143e9a0071f77af473f9d8
outline-opml-for-outliners = OPML (para editores de esquemas)
# en: b22f39c9558f672318bf617175bf3daaa236c71f
common-open-in-new-tab = Abrir en una pestaña nueva
# en: cdd6290b6b2860663a3ff7c60cbe70af640e9c39
common-outline = Esquema
# en: d7f6278b9a3a511b82633cbd63a4e86e91bab2d1
outline-outliner = Editor de esquemas
# en: e57362d579b61ac9d08f5012ee0adf6fde22a855
outline-outline-lowercase = esquema
# en: db2483000d154ca9fd74d41fc4e063a4b28faa87
common-paste = Pegar
# en: e45795fb6033ae4ecc1e2e3610273fce71a317d7
outline-plain-line = Línea simple
# en: 9580fcbce0c31ceaa47eb583e5f7ce637fdc8a0a
outline-plain-text = Texto sin formato
# en: 67ea25b11508ee37fa6c09bc9d3a1d6aa9a30f96
common-show-as-slides = Mostrar como diapositivas
# en: 59df6d7de818cdbeb08aa7f083aff96c1bccd1f5
outline-show-as-outline = Mostrar como esquema
# en: b306a7c32ba84dd4adea8612dccc99c15065eb53
outline-take-away-connection-from-from = Quitar la conexión de { $from } a { $to }
# en: e963907dac5cd5c017869b4c96c18021c9bd058b
outline-take-it-away = Quitar
# The compound bullet (Paul, 2026-10-15): the statuses a document sets in its head, a status's pill, a due day's chip.
# en: e92aab82fce62899699581b5597abdda8175f2dd
outline-statuses = Estados
# en: bae7d5be70820ed56467bd9a63744e23b47bd711
outline-status = Estado
# en: c206561903295f2cf5944906fdfc55f1e8a5d45b
outline-no-status = Sin estado
# en: 1bcdd54c54c2bbd162c6353f5157804ce2270af5
outline-status-status-tap-for-next = { $status }. Toca para cambiar el estado
# en: 4c1aeebc433bcb8eb4b05434619ea3136b785ea8
outline-due-date = Fecha límite
# en: bfe11361dd8dc7cc66f5cd6f33d394a95c71c96c
outline-due-date-ellipsis = Fecha límite…
# en: 1cfca97d4ac1000c67f7b345992a5b58b3dac4b0
outline-due-date-change-it = Vence { $date }. Toca para cambiar
# en: 6cf55f3558276e2eefff5dd41ec206dc9780bebf
outline-remove-due-date = Quitar la fecha límite
# same
# en: 891e9d6d47f1bacfcba2dca1b282afcbcd25d94d
outline-agenda = Agenda
# en: aa73cdd3260a16a41d572c06ee0da42cb4b85286
outline-by-status = Por estado
# en: 0e719dcbe720c315d66c977072f10251b56bd994
outline-nothing-to-do-yet = Aún no hay nada que hacer. Aquí aparecen los elementos con una tarea, un estado o una fecha límite.
# en: 064c87e25e9cca38db987bafd98c9fc9b3003456
outline-line-to-parent = Línea hacia «{ $parent }»
# en: 99fec066e5bc2f5acc70261b4b5dd4b171fb491a
outline-arrow-to-parent-item = Flecha hacia «{ $parent }»
# en: e37f9b066587aa06d9d2f6df504727599d9f5e4a
outline-arrow-from-parent-item = Flecha desde «{ $parent }»
# en: 27228d1a3266064e49da7e3949d339b08473e294
outline-edit-statuses = Editar estados…
# en: 70dfe3298343e43d0c29f07274084a4ce961dd7a
outline-add-status = Añadir un estado
# en: 4f9beff18cc6852b012093ba97421788466bb3bf
outline-gray = Gris
# en: 23376bab580fd3f3d521c66a65a03e7753da54cc
outline-last-status-means-done = El último estado significa hecho. Las tareas con ese estado se marcan como completadas.
# en: 7312a31a2c880f2d456663b6f91ad6da980b3a5e
outline-take-connection-away = Quitar conexión
# en: 656e5c87ae5cd391807e13c85fb32635c2d441c2
outline-tap-item-to-connect-from = Toca el elemento desde el que conectar.
# en: 7a717eefe223e502e86655b5bf8eb999b867a9dc
outline-tap-item-to-connect-words = Toca el elemento con el que conectar «{ $words }».
# en: 6ca2aebe7601f4f49f7f7df1ac23a0ac4a39abbc
outline-question-options-under-it-and = La pregunta, las opciones debajo, y de cada una lo que habla a favor y en contra.
# en: da74cb6baba7a464fd8881af861a8c8d7952aff9
common-trip-planner = Planificador de viajes
# en: 09ae5dce4d22019190e52d1611d1544becf36489
outline-twenty-minutes-in-three-parts = Veinte minutos en tres partes: el problema, la idea, lo que significa; una diapositiva por elemento superior al mostrarse como presentación.
# en: 2af9d498f852995329b0033573277dce32d09ba0
outline-unfold-all = Expandir todo
# en: f5857a77d395db75bc57c2c76b92dc8fa4773053
outline-unfold-n-inside = Expandir ({ $n ->
        [one] { $n } elemento
        [many] { $n } de elementos
       *[other] { $n } elementos
    })
# en: 621521f9a8788695ec292cbec54d2792cfdf0a7d
common-untitled = Sin título
# en: 1e65f823e3600c2c4cec7aff6db37af296fca073
outline-view-as = Ver como
# en: 828c360c884f9246750461eea43fee4e42c6b52c
outline-zoomed-in-on = Centrado en
# en: 38eca6735f66d186c0bd9c549873e774551dc35f
outline-a-plain-line = una línea simple
# en: 884abd948f43aba4e5851b71a20e97aed7a6c96e
outline-arrow-from-parent = una flecha desde el elemento superior
# en: b1efb9ef91ffdf7d42595fb81fb8b74184a5efbc
outline-arrow-to-parent = una flecha hacia el elemento superior
# en: 54406ea0a263efcf4d3204fff2200f7f4d982c90
outline-arrows-both-ways-lowercase = flechas en ambos sentidos
# en: 0048342aeabb8b2918689354650579bb2108a957
outline-e-g-owns-feeds-reports = p. ej., posee, alimenta a, depende de
# en: e7292866259d82c2071011b0e5de8b80407998e7
outline-item-above = el elemento de arriba
# en: 973c239ffbd8d0522cea9cfa9e2664d2a96a2e01
outline-this-item = este elemento
# The templates: their names and blurbs (templates.md says what each is for).
# en: 5c3a8ec4fdc8ab96e7ef9f3a0739b0639c6ca926
outline-company = Una empresa
# en: 8a7edf5c70300a3c146de3a15b534939e72226da
outline-decision-tree = Un árbol de decisión
# en: c59b4e8c614eaaf02a0ac81499bc50947192118e
outline-family = Una familia
# en: 3ac1f9e665cb59f3a08ee0fba150dbbf4aab85a8
outline-five-minute-retirement-toast-opening = Un brindis de jubilación de cinco minutos: una apertura, tres historias, el brindis, cada parte con su tiempo en su línea.
# en: 9ed550a11b44d369413c1b004a5008d3c127a6c1
outline-novel = Una novela
# en: 35c9710d58daeb1aebb2143cfaeda278f0f67311
outline-product-launch-product-marketing-and = El lanzamiento de un producto: el producto, el marketing y el soporte debajo, con uniones entre las ramas.
# en: 79fd5c646ff9b077d10357db663c9b7d59acb64f
outline-research-plan = Un plan de investigación
# en: 6a1ae380627dbc8fe79ff6a208c76b89d230979e
outline-speech = Un discurso
# en: f081caaa6b5cd7b0858a4a87cc6f81bdb215fd30
outline-syllabus = Un programa de curso
# en: 5b163ae0d9a3fd9b5ab6a8b6c27374091ceb25de
outline-ten-week-course-when-and = Un curso de diez semanas: cuándo y dónde, un tema numerado por semana, cómo se evalúa y qué leer.
# en: 9cea5f42a5742d9eef722836a7a7b59c6a5c0c5a
outline-thesis-two-arguments-with-their = Una tesis, dos argumentos con sus pruebas, la objeción y su respuesta, y la salida.
# en: e5f2a2c3f76b55d5786f1c311773def62d6920f3
outline-essay-plan = Un plan de ensayo
# en: d926d538e1be8112e81292507985514feac5e4c4
outline-draw-as-family-tree = Dibujar como árbol genealógico
# en: bfef6f97dfb8178f726a96b8861bc2536e8c6fb4
outline-five-days-in-lisbon-packed = Cinco días en Lisboa: la maleta por categorías y lo que hay que hacer antes de salir de casa.
# en: 987acdf86bb6a373c995aa374c004bb21bf2e576
outline-indoors-or-out-for-saturday = Dentro o fuera para un mercado de sábado: las respuestas de cada pregunta en sus líneas, sí y no.
# en: 61390a6b5d7d9268827d91b4a818c6a5fbe2011c
outline-no-internet-at-home-question = Sin internet en casa: una pregunta en cada paso, sí o no, hasta la llamada que hay que hacer.
# en: b431e4b41d5021ff680bdee33aebda8738cec5b0
outline-packing-list = Lista de equipaje
# en: 013532bb7e7d08afa22a3149f8e74b5ee4d9eaf5
outline-parts-and-chapters-of-book = Partes y capítulos de un libro de ideas, con una línea bajo cada capítulo sobre lo que defiende.
# en: 5f646cfc8f40ae2515c9d774ae5ad523f524b998
outline-people-and-three-acts-of = Los personajes y tres actos de capítulos, cada uno con lo que ocurre en él, unidos donde un personaje cambia un capítulo.
# en: dbb00953c7a1565bffce71190cfb90220362c471
outline-question-method-budget-that-adds = La pregunta, el método, un presupuesto que se suma solo, un calendario, los riesgos y las lecturas.
# en: 57b065618d9af543d6fcc5085edd94aa723f8403
outline-three-generations-and-next-each = Tres generaciones y la siguiente, cada una con sus años, dibujadas como árbol genealógico desde el menú.
# en: 285ec850c11d78bac10f6bfa31b69a37f1b257c9
outline-troubleshooting = Resolución de problemas
# en: c126bf3ee80a183d7c300cd69a01e39ab7dd8e53
outline-who-works-for-whom-at = Quién trabaja para quién en una panadería de nueve personas, cada una con su puesto, dibujado como organigrama desde el menú.
# en: 0c6266451117f0382231513e4c30d38fb976086e
outline-pdf-sections-and-bullets = PDF: secciones y viñetas
# en: 32897da2f696f1ddc73da9ef0575827530a80b1a
outline-fold-unfold = Contraer o expandir
# en: 74341e3c271df3c784e595b804b1f90be0f80429
outline-name-line = Etiqueta

## the Presentation Builder

# Its templates: the occasions and a second of each printed format.
# en: 44467d7b18daac8d8100b68ebc482fe0ee0ac9b6
deck-choirs-winter-concert-welcome-both = El concierto de invierno de un coro: la bienvenida, las dos partes, notas sobre la música, los cantantes y la letra para cantar con ellos.
# en: a816093d69f08b81c457d818e6d1bd72e0915b10
deck-lesson = Una lección
# en: e2d04797e440ee0933d032a29cfbfad5edbc99c7
deck-lost-pet-poster-in-red = Un cartel de mascota perdida en rojo: el nombre, cómo es, dónde se la vio, un teléfono al que llamar.
# en: 4d44cafa1d032ca3ceda90fa9830717ea5cf8491
deck-morning-workshop-schedule-checklist-of = Un taller matutino: el horario, una lista de qué traer, los pasos y adónde ir después.
# en: 7dc13283809d7ed9c506873aee1486fd988cfe5c
deck-pick-your-own-farm-what = Una granja donde recoges tu propia fruta: qué crece y cuándo, cómo funciona, los precios, el granero y cómo llegar.
# en: b822b42bfed453711aed6a262083b2a7aef5cd89
deck-pitch = Un pitch
# en: a9964d2d4aae75e70e2e8dace25022b6679f25d7
deck-product-in-sentence-what-it = Un producto en una frase, qué hace, precios en una tabla, las fechas de lanzamiento y el contacto de prensa.
# en: a46e6eb74ae783d7eb35ae76afc5ab984683886f
deck-trivia-night-in-four-rounds = Una noche de preguntas en cuatro rondas, una tabla de puntos y las respuestas en la última diapositiva.
# en: efebc637859160a6f694e66576eebb294de14712
deck-residents-meeting-about-new-playground = Una reunión de vecinos sobre un parque infantil nuevo: por qué, qué se propone, el presupuesto en un gráfico circular, cuándo, cómo opinar.
# en: 02e7a62fc65ed26cb0751706a5ea8f5783414eda
deck-science-lesson-on-chalkboard-aims = Una clase de ciencias en la pizarra: objetivos, lo que ya saben, el modelo, una comprobación, deberes; las notas del profesor debajo de cada una.
# en: f3a66c7b2a6ebda85ea74938fce4c397eae2a131
deck-seed-pitch-in-eight-slides = Un pitch para una ronda semilla en ocho diapositivas: el problema, el producto, la tracción en un gráfico, el negocio, el equipo, lo que se pide.
# en: aab8da6eadee157bba3937e9dc00741cfe48b13f
deck-bike-shops-quarter-for-its = El trimestre de una tienda de bicicletas para sus socios: ingresos en un gráfico, aciertos y fallos, las cifras que importan, el próximo trimestre.
# en: d0fa5e5696edaf949dfe9e739a7a2eef0d433ae2
deck-small-story-in-panels-about = Una pequeña historia en viñetas sobre prestarle algo a un vecino.
# en: 6c1ff81a2445a9eab1616588060b483cd5b6cde8
deck-twenty-minute-talk-with-speaker = Una charla de veinte minutos con notas del orador en cada diapositiva, un gráfico de los resultados, una nota al pie y las lecciones.
# en: 1a2fac58a0b80e771b6d2e526e7d3fee2cf6ef85
deck-badges-for-conference-each-with = Credenciales para una conferencia, cada una con un cargo y de dónde es la persona, con el aspecto Océano.
# en: 7aa6a43fffd387b34fc7d06c7845de3f5bef745a
deck-comic-umbrella = Cómic: el paraguas
# en: 1796880ad702715de60aad7227c9bdca655f0fff
deck-concert-program = Programa de concierto
# en: 3843bc86872f81764fe670a10bd1192b5a78018c
deck-conference-badges = Credenciales de conferencia
# en: cae2fc32956e250bfadb1c6411ff593e325cf580
deck-conference-talk = Charla de conferencia
# en: 27fa527134938f2343573a9c4485c57bc7e6167e
deck-farm-brochure = Folleto de la granja
# en: 6bd753630675cfdfe68c546580b14419bd8e80a4
deck-lost-cat-poster = Cartel de gato perdido
# en: dd7cf099a356a9e69908104ae2d8c2743ba41fb7
deck-product-launch = Lanzamiento de producto
# en: 68d708c4452b9eaca2d5d38e9d0a5848059fd138
deck-quarterly-review = Revisión trimestral
# en: ca40a6181df561c65b71e9ebdf580ccae6b007b7
deck-recipe-zine = Zine de recetas
# en: 02bfd82260b75fe685e4e972cb9a3ae9b0a42f5f
deck-seven-soups-for-cold-week = Siete sopas para una semana fría, una por página, en un zine plegado a partir de una hoja.
# en: 44b5c7f041391d8b41a8ba365b6f13522877b478
deck-their-story-for-reception-from = Su historia para el banquete, desde cómo se conocieron hasta la propuesta de matrimonio, con una línea del tiempo y un agradecimiento.
# en: 2aaeb944a6b05f452d512dc7dd5220adeee294ea
deck-town-hall-notice = Aviso de reunión vecinal
# en: 14444c384d263fff25ba48b195abb55def791b75
deck-trivia-night = Noche de preguntas
# en: 0377beb012ed13e1986227ef8915aeab709ad5d9
deck-wedding-slideshow = Presentación de boda
# en: f34f4184c545fd4fec60bbc441ead88d1f1fdd1b
deck-workshop-agenda = Programa del taller
# en: e4c8d951f1cc300d96873c7cfc850ad0f0ddaab4
deck-presentation-lowercase = presentación
# en: 1e35470a39e5b3ddca4d3b585c9011db9b4c4dc6
deck-slides = Diapositivas
# en: 5075541433d31fb8cf207ced97577686ac3fe961
deck-chosen-slides = Diapositivas seleccionadas
# en: d7935967cfd3de8f11b33801800bece8d90cb55f
deck-move-this-slide-drag-it = Mover esta diapositiva: arrástrala sobre otra
# en: 19926fc5c47a7a39dd1435da06e3fc4c027458ea
deck-slides-titles-bullets-two-columns = Diapositivas: títulos, viñetas, dos columnas, iconos grandes, otros documentos en una diapositiva; o un zine, cuadernillo, folleto, cómic, cartel o credenciales para imprimir y plegar.

# The layouts, the transitions, the formats
# en: 7509c5747e5db3dfa3373afc42eca9f5b27a8599
deck-bullets = Viñetas
# en: 8d8f0f25822179c33b917613ec2d022ef593c340
deck-two-columns = Dos columnas
# en: 1d6bece457daf37f906239468dadfdfb619adb98
deck-big-icon = Icono grande
# en: 5298d08bb7ae7d01f4efcdbb94ff03fc487fd11c
deck-fade = Fundido
# en: 38d13bda5c40afc32d629f81dec6c156cbea328e
deck-cut = Corte
# en: 38d13bda5c40afc32d629f81dec6c156cbea328e
common-cut = Cortar
# en: a5d5b46a7720824b51da4be0af97f5cfd1168cd0
deck-slide = Deslizar
# same
# en: 9b3cbed5c490c07473546a88768ba29b787e9e52
deck-zoom = Zoom
# same
# en: d4ff278598ebbd3f36cecf27e68c66de49d2f62f
deck-zine = Zine
# en: 8ef5c45547ec6440e6dde4870e3f92d6c08dfbaf
deck-booklet = Cuadernillo
# en: 80dceb58c1f9daca0ebaa066d80e670cfdf1123e
deck-brochure = Folleto
# en: 5549c5222b1b1eb52e37ae3542dcc0f7cb9fd376
deck-comic = Cómic
# en: a33539ca77a6c42fd7a1e50aef1516b3a87d7c85
deck-poster = Cartel
# en: be13a787e958beeb3139d8e1b3ebc2b879732db2
deck-name-badges = Credenciales

# The themes (the Look menu) and the icon colors
# en: 34118050b206b7ee3e5bcb8e4adbe8c17630020d
deck-plain = Sencillo
# en: b6369ed60eb9bda1aa642868ddfb5053547f0206
deck-boardroom = Sala de juntas
# en: 39973be20679a94e4c998a58c0f6c76daaf6cd11
deck-ivory = Marfil
# en: 558287ddcc3557b09ec00ca17b3e4be7e6645858
deck-midnight = Medianoche
# en: 220c98deb1482e5b5361b123b929ee8e4ac1e18d
deck-graphite = Grafito
# en: 79141e063e10bb80a7b799878f12312eb89fbafd
deck-confetti = Confeti
# en: 181bcd5760fd32163554c899301a30b2cd381cf4
deck-sunset = Atardecer
# en: 76022a00a16b0482beec04274945ed192a931410
deck-ocean = Océano
# en: 07a59415416c4f5915d5efbe6319ca69450f0a77
deck-bubblegum = Chicle
# same
# en: bc727a101b60bbc2b4f96365ecf1ee4bd1db685a
deck-arcade = Arcade
# en: 5efe442a0ed9b1e51ec7e85696d66d6ac3db83a8
deck-chalkboard = Pizarra
# en: 5f941ab65fbabe87f41cd73c9136f5a4c97087e8
deck-fun = Divertido
# en: 0bd48966c3fe51c025c34a472af7fac64b2292dc
deck-themes-color = El color del tema

# The bar
# en: 4e9f7a31eef4c69e0aacb643f6856372cd6e3247
common-present = Presentar
# en: 3c47e73f6a8bcb018bdbe91d9312e8e1777050f7
deck-see-sheets-to-print = Diseño para imprimir
# en: ca742a9ecf2f35a59704398ead009f1d8e554a0c
deck-back-to-pages = Volver a las páginas
# en: 442250df38e5e516ff1c2ce97d051b8997c7d976
deck-headline = Titular
# en: 1cd715cdb2322da76e4ce7f490064782c83337b2
deck-layout-layout = Diseño: { $layout }
# en: e85e5488b4184d6cfb4c0aa36e169a271068ec0f
common-look-theme = Aspecto: { $theme }
# en: 896afdc59964bf4da2b261b6056d23286d186427
deck-transition-transition = Transición: { $transition }
# en: 438dcf262325319835f0d0aefa8a4ecddaf49a16
deck-format-format = Formato: { $format }
# en: f16eadab2a72ff13044cc806dbcf2c117b32244f
deck-printing = Impresión
# en: d5939283a7a53a72f09e4f327bc22f2872b64257
deck-one-sided = A una cara
# en: 256dd8b8869a6c72f553a2905aef393f2b39df0d
deck-fold-and-cut = Plegar y cortar
# en: 8cb849ee6e612fbad8641d053d8e66b2ba560a1b
deck-two-sided = A dos caras
# en: b82a2c3204554a9c0a82b44aa7eb5f94916b1c13
deck-cut-and-nest = Cortar y encajar
# en: 6e19d7b7deffd2974f632ec3e697646de978130e
deck-end-with-qr-code-of = Terminar con un código QR de esta presentación
# en: 0c7dca360d478b76246b0ddf594aed2299af3ef2
deck-move-slide-up = Subir diapositiva
# en: 8e87a8ca3749be93e307f172d62814c1b58865b4
deck-move-slide-down = Bajar diapositiva
# en: 3a260e90c0d893d60ed227c10bfade84b5a2adef
deck-delete-slide = Eliminar diapositiva
# en: e984a8f80b4d34ad2ca73e2a3a432a6a08a6db27
deck-move-page-up = Subir página
# en: 21c3799bf3525e9642bab926aa4f81f07a5d8a0f
deck-move-page-down = Bajar página
# en: 260b69625056e26e4029491cf672306054bf10a6
deck-delete-page = Eliminar página

# Insert
# en: fffd75e48f61364f8486681ac4213184abd2373f
deck-bullets-slide = Diapositiva de viñetas
# en: 6e281f49affc0fc305e572fc6d08a6ca82a597a1
deck-title-slide = Diapositiva de título
# en: 8401be1cb1b1122b954639aeea6e348e2c709b23
deck-two-column-slide = Diapositiva de dos columnas
# en: ecca8f3f7107aaa37ae2674734c101faac7e3e11
deck-big-icon-slide = Diapositiva de icono grande
# en: fb06270f7c212baabc8749ffc36e49dc8f321548
deck-page = Página
# en: 31f820710f9d6c3e03e8b9e5996902c45a8816da
deck-title-page = Página de título
# en: 9b0d34e9841a2c5fa15e4c9e68c01f338dc34930
deck-two-column-page = Página de dos columnas
# en: cfdc49e689f75ddfc0372d83f7c9a396b6616dd8
deck-big-icon-page = Página de icono grande
# en: 17a4bbb4cefcb0a1fccf38f1c561b2a18fe44456
deck-four-more-pages = Cuatro páginas más
# en: a59879f8796236335931a0b95f1cb1a1db39e210
deck-on-slide = En la diapositiva
# en: 9bab04556dc2a912d86a00f7b4dcd7c540468b8b
deck-on-page = En la página
# en: 600584c2d5ccb97c0c0c424d9f32d6b102fcb040
common-pages = Páginas

# The canvas
# en: 028137d1d6f1cf21777ce8a83b467b80e04a6168
deck-add-icon = Añadir un icono
# en: f68895d5ec9c6f1865e9ee69f1d423cbfd251599
common-change-icon = Cambiar el icono
# en: fd8de0a92eedac5ccdf6c587b3ae177b97da0ae0
deck-pick-icon = Elegir un icono
# en: 3805391efb1ea53cff43e62a0dc134be9b14bd8d
deck-left-column = Columna izquierda
# en: e8965b7c19d1ad62de75e624088e40b37d16f206
deck-right-column = Columna derecha
# en: 58952208e1b00c3e046eab00b1e20bb448262df9
deck-one-bullet-line = Una viñeta por línea.
# en: a32090c9358d8e112f4074c11a76811a50d53d5c
deck-one-bullet-line-tab-steps = Una viñeta por línea. Tab le aplica sangría.
# en: f8948a4a523b4312c5567f9cff1f6788c757998f
deck-line-or-two-under-title = Una o dos líneas bajo el título
# en: 236bcf1c6a83d3b0f85a065c777d7948b22a0c22
deck-what-this-page-says-type = Texto de la página. Se reduce para caber en la página.
# en: e80e281dac24d9c4c3f60dcdbf8700e9603b825e
deck-panel-line-what-is-said = Una viñeta por línea: lo que se dice | el pie. Icono le pone una imagen.
# en: 3d6e76c9325034deb76b92c8cc47a2d3c22fcdf3
deck-speaker-notes = Notas del orador
# en: f0ea152b4f68c54e5bc3476bae70301bc7fb2523
deck-n-total = { $n } / { $total }
# en: 3b73ff036c4ba5dc509f9a2e55189b33fc8013bb
deck-document-on-slide = Un documento en la diapositiva
# en: 800ddde9b84d77765694212f6af1a9ed4329c77c
deck-remove-from-slide = Quitar de la diapositiva

# The rail and the sheets
# en: 7e4475e68efd3a93e2aa3ad794afd9388b4c89d1
deck-slide-n = Diapositiva { $n }
# en: 5f78f871f6b48ae876a1dbe89a5b8bff6f6b9849
deck-front-cover = Portada
# en: 95842f717432a63230077bc5ea48addf5bc52947
deck-back-cover = Contraportada
# en: 10e4725d5544e065501162abcf8a53b94451df0c
common-page-n = Página { $n }
# en: dd19f9887573a9f06294de48329bfb1b3a5ad273
deck-front = Frente
# en: 6f453fd2a404a86955b0f23219d84f2bcb4e7d06
deck-inside-left = Interior izquierdo
# en: 4fe87c5667532867fc721531b92a7ca6b391eb8a
deck-inside-middle = Interior central
# en: 3e654f345b202e7b158b2c61ff91fe55b0d3d46d
deck-inside-right = Interior derecho
# en: 418bf9a5530258c65b3dbc1f932667dafa01469c
deck-inside-flap = Solapa interior
# en: b52b36b7269fbfc58ec24bb724691951a3decbe8
deck-back = Reverso
# en: 3369aa225b34e01144a4c49dd350db04732a2720
deck-badge-n = Credencial { $n }
# en: 9cc25309d07de0adfb989faaaaa74f7cb5a06e38
deck-last-slide-added-for-you = Última diapositiva: un código QR de esta presentación
# en: 03c90c8e6a7e028c2e9caeadc1961fb5c0ad4e57
deck-ends-with-qr-code-of = La presentación termina con un código QR para que el público se la lleve. El botón QR lo desactiva.
# en: 13c7cb226b093919972f5e423aeb0abae93960cf
deck-qr-code-of-this-deck = Código QR de esta presentación
# en: 5d5bc5601280c776405941347bbf7e9c63dc3954
deck-sheet-side-n = Hoja, cara { $n }
# en: 1982f74c2102a55783a4774ddd4895dc7fec26f0
deck-cut-along-dashes-this-half = corta por las rayas · esta mitad va por fuera
# en: 0fc0c2932d66df46e1af55ac50d98be2bccd63c3
deck-print-on-back-flipped-on = imprime por detrás, girando por el lado largo
# en: e0226944c5e9e4df97a3bf718ac488a8a51118fa
deck-cut-along-dashes-fold-along = corta por las rayas · dobla por los puntos
# en: b0ccda7ec0d37c14d00e5e9f57eeadcb1045ebd7
deck-print-it-double-sided-on = Imprímelo a doble cara en papel carta, girando por el lado largo, a tamaño real. Corta por las rayas, pon la mitad de arriba sobre la de abajo y dóblalas juntas por el medio.
# en: 7d7f71d31c8968c0555f49f9430133796d626c4f
deck-print-it-on-one-side = Imprímelo por una cara en papel carta, a tamaño real. Dóblalo por la mitad a lo largo, luego en cuartos; corta las rayas del centro; junta los extremos y dóblalo como un libro.
# en: ce30358159a7953f092af19e48f7dad47608c83d
deck-print-it-double-sided-on-letter-paper-flipping-on-short-edge-at-actual-size-stack-sheets-in-order-first-on-outside-and-fold-them-together-down-middle = Imprímelo a doble cara en papel carta, girando por el lado corto, a tamaño real. Apila las hojas en orden, la primera por fuera, y dóblalas juntas por el medio.
# en: 96bf1a2ba3e6d649669efc225b3104521735ff25
deck-print-it-double-sided-on-letter-paper-flipping-on-short-edge-at-actual-size-fold-right-third-in-then-left-third-over-it-front-is-on-top = Imprímelo a doble cara en papel carta, girando por el lado corto, a tamaño real. Dobla hacia dentro el tercio derecho y luego el izquierdo encima: la portada queda arriba.
# en: 6d4cc8d4405840522000283a7e419c1c93e89392
deck-print-it-on-letter-paper = Imprímelo en papel carta, a tamaño real.
# en: f81a8cbfa80cae20e64c2c1dd92fec6cfefba6c9
deck-print-it-on-letter-paper-at-actual-size-cut-along-dashes-six-badges-sheet = Imprímelo en papel carta, a tamaño real. Corta por las rayas: seis credenciales por hoja.

# Presenting, and the closing slide
# en: 6e875951a6f9aa1374d93572de657c12ded57355
deck-presentation = Presentación
# en: 50f94286ba30706a19070d3ec0a0c8d34d6cf6eb
common-previous = Anterior
# en: bc981983e7f547dc62e19a1e383acfe00782a6d5
common-next = Siguiente
# en: 10225bffa1614015caa499978578b424eb0ee56f
common-stop-presenting = Dejar de presentar
# en: 1380030776f8bb0e462fd6e828a563e49da50652
deck-slide-n-of-total = Diapositiva { $n } de { $total }
# en: 70440046a3dc2e079f23ee1c57dfa76669b732aa
common-notes = Notas
# en: bd0dad7cbf71b13b2e545d8ce477027ffc106b45
deck-n-hides-them = N las oculta
# en: 45c44dc2566819f835fd788e2b7a6c5bee5177c4
deck-take-this-deck-home = Llévate esta presentación
# en: acc1edc431e346786fab17d4f10e195ca72257d6
deck-take-this-deck-home-title = Llévate esta presentación: { $title }
# en: 7fc2d8c7fd4164039149b5a9f2063ddf7ab9d76a
deck-scan-code-whole-deck-is = Escanea el código: toda la presentación está en el enlace.
# en: a0f82f698bc01f5dc90c760db684589e2d8277eb
deck-a-qr-code-of-this-deck = Un código QR de esta presentación

# Downloads
# same
# en: a149055ecee5f95be2951f0b5454f3d1ef47c786
deck-powerpoint-pptx = PowerPoint (PPTX)
# en: 7660a22bdc9507edd353dd61198b9aa86488d936
deck-picture-of-every-slide-zip = Una imagen de cada diapositiva (ZIP de PNG)
# en: 98a41f54e049532b6032b88d7656348adc178c2a
deck-animation-of-deck-gif = Una animación de la presentación (GIF)
# en: 3bab526d831e1024e6f8e7d197f9c3d72cc4f0e4
deck-film-of-deck-webm = Un video de la presentación (WebM)

# The templates
# en: e5604bc465a212ad3d7f4e13ed282f030d9d3a6b
deck-title-agenda-three-points-with = Título, orden del día, tres puntos con notas para el orador, y un cierre.
# en: 60c974074604818e661eff7940285669d1496647
deck-status-update = Informe de situación
# en: 34714be3698c31c72afb1d4d4b8a7b0c69f30fc5
deck-done-and-next-side-by = Lo hecho y lo siguiente, uno junto al otro; luego los riesgos y luego las peticiones.
# en: e946db45d2689df95cbac9f8137664409c51f5d8
deck-proposal = Una propuesta
# en: 52ab7599cc26432ef9b492b401d04eee1ca5e699
deck-what-you-heard-what-you = Lo que oíste, lo que propones, cuándo, cuánto cuesta.
# en: b8e1f28fed63f996c8915470a7ee9ce8aef9b75f
deck-eight-small-pages-from-one = Ocho páginas pequeñas de una sola hoja de papel: imprime, dobla y corta, o léelo tocando en el teléfono.
# en: 31b11edde49cd1bd80a198f240426c5b2d8cd65f
deck-booklet-of-half-letter-pages = Un cuadernillo de páginas de media carta, de ocho a veinte, dispuesto para imprimir, encajar y plegar.
# en: ae07389f7b537dbd7eb3007d3f2b36ca3c35c404
deck-trifold-brochure-six-panels-on = Un folleto tríptico: seis paneles en las dos caras de una hoja, cada uno donde lo necesita el pliegue.
# en: 88c71dbca35b2e7c498adce21174cb1102af384e
deck-mini-comic-panels-with-picture = Un minicómic: viñetas con una imagen, un bocadillo y un pie, plegado a partir de una hoja.
# en: e610bb7f6eac1dd5622723ccc779e31e9d9ed190
deck-poster-or-flyer-headline-and = Un cartel o folleto: un titular y unas pocas líneas, tan grande como permita una página.
# en: ec024ffdc152af00e77f7219a5293545bdd3bb65
deck-name-badges-for-meetup-one = Credenciales para un encuentro, una página por persona, seis por hoja, listas para cortar.
# en: 9a51ba7142888f3e0199896de291a1fb4b4298f1
deck-edit-this-deck = Editar esta presentación
# en: d5947c525ed0d53dce794385a2cc1cd6e2459dbd
deck-new-slide = Una diapositiva nueva
# en: 720856fcb53d62f79a364c36d8cd2314121430a6
deck-presenting-back = Atrás (presentando)
# en: a212c73bb85a53b57609d239c50f170773e07d77
deck-presenting-next-line-or-slide = Siguiente línea o diapositiva (presentando)
# en: e53a09169fa399b79b5b814de5e65669714f9165
deck-presenting-whole-slide = Diapositiva completa (presentando)
# en: 7722768d8b861ddedb1f6400352985ca0cfd4a08
deck-slide-before-slide-after-on = Diapositiva anterior o siguiente

## the Calendar app

# en: e4ffacba5591440a14a08eac7aade57c603e17c0
cal-calendar = calendario
# A span is an event on the calendar or a task on the schedule (the Gantt view); { $every } is "Every week" and the like.
# en: 11fcad4bfe2782393e5d2ac5e04d65349890ea94
cal-name-yours-say = Un nombre (el tuyo, por ejemplo)
# en: e288d42e3bba2f9fc3b7f2287d2ea4f141e72236
cal-schedule-phases-with-their-tasks = Un cronograma: fases con sus tareas debajo, cuánto avanzó cada una, el lanzamiento al final.
# en: f0424f3e15f33d07de80ddfd02a4b56f047767d7
cal-week-earlier = Una semana antes
# en: 5e63d8681fdc3170ed99fc3abcc3668620f299ca
cal-week-later = Una semana después
# en: ab455a2fb151da1c7d0c39c7534c2f935e028ce9
cal-weekend-of-sessions-at-set = Un fin de semana de sesiones a horas fijas, una sesión tardía pasada la medianoche.
# en: 114574336ac7883aebd0653b3fc5e82f9262dc86
cal-all-day = Todo el día
# en: cbf28df446643f9968f7fe68968bca51be5cf792
cal-chart-scrolls-sideways = Gráfico (se desplaza horizontalmente)
# en: a13d5b9d3da48c8bade3d645e0de9a9bb812c648
cal-color-for-new-color = Color para lo nuevo: { $color }
# en: f6bb0f468a8569c67b3d6826e57e62c5500c3681
cal-days = Días
# en: b50e483c45f8f17795b63f822127ff0171086900
cal-days-and-times-on-month = Días y horas en un mes, un año o un cronograma, en cualquier zona horaria.
# en: 9ccd3e7bb11493f1e93950f7db9148a4794037b7
cal-done = % hecho
# en: a7028454f240815938eaf701823b7d55dbaf98a9
cal-edit-event = Editar evento
# en: 8a4d4e6eb9a367d616b8a4cbfa2792068482e884
cal-edit-task = Editar tarea
# en: 99570f85bb2bae0dbe3e8f2f3d6d6f765ee7c47e
cal-choose-task = Seleccionar { $task }
# en: 72b4644a41881ce4e156ce3283119c74f598cbea
cal-day-earlier = Un día antes
# en: 8d6915ee723c8b3c01f29002cfed7d597d56c2c7
cal-day-later = Un día después
# en: 66a755ea0d935aeac763da63deebb69b0eb54ba9
cal-dates = Editar fechas…
# en: a2bb9d34b8a1a79665858d354585cf147e0dee4e
cal-end = Fin
# en: 89d10cd6c1e1437d6318d6fbb25a40e0aaaddd34
cal-end-date = Fecha de fin
# en: cd7800da7f4ff94a0e14445d7f94b6345d1b7b8a
cal-end-time = Hora de fin
# en: 91856dcb7d93f9c6725649160ab6abe379d8e5c9
cal-ends = Termina
# en: ad8919ace091b14011c6439cfd5e1707b58f5abd
common-event = Evento
# en: 3b2eb5131055ad07ac1d08de2f11f900286a51b5
cal-every-day = Cada día
# en: 7f3932f9cb96cb99072771c992c0ce3c0b342bfb
cal-every-month = Cada mes
# en: 043058e2050c0345ef7aac78bd9025d3adce099a
cal-every-week = Cada semana
# en: cea537cd72239840db0466ba29562d222299f7ce
cal-every-year = Cada año
# en: 557ea666ac9eafe1543ea9c4423073c8be815d79
cal-family-calendar = Calendario familiar
# en: 05061b43a7c1a210598d8a217347a96fdb45df8d
cal-festival-weekend = Fin de semana de festival
# en: a3f5851f7cb29b64859b01ec6429ea85811bb192
cal-how-many-times = Cuántas veces
# same
# en: 834c5ef85d6fd469b8be75d8685faf6f9e84eaa7
cal-icalendar-ics = iCalendar (ICS)
# en: 4bcc328bf3b5b886738db678a175936615491289
cal-its-own-zone = Zona horaria del calendario
# en: 2a177256a408fa4fc557b301041589b798826d70
cal-last-day = Último día
# en: 58ef633830b461aa76bf4ee90e3b2831ff588508
cal-lessons-birthdays-and-holidays-color = Clases, cumpleaños y fiestas, un color para cada persona y lo semanal que se repite.
# en: 7c7f5d049fad2569721d446c4a811f9bd5da5393
cal-level = Nivel
# en: 082bc378cd60e17a38d99898b21955299c5b60c8
cal-month = Mes
# en: 770d509550265dba792aa81868b856eb67225e41
cal-my-zone = Mi zona horaria
# en: 80c3052d33ccdee15ffaaa110c5c39072495fe63
cal-never = Nunca
# en: 2ef3795c979293106a6ccf13359d732165fb660a
cal-new-event = Evento nuevo
# en: 25d3553217b2058be97b5339fbe6a576cfeb6856
cal-new-event-on-day = Evento nuevo el { $day }
# en: 17b2b838c5ce22c961a36736534a5029d6ba0087
cal-new-task = Tarea nueva
# en: 8abf7cf1d0b36ff16ebbe26b8285a65d9d1582f6
cal-next-month = Mes siguiente
# en: 22c6f667e4103029954aa28d43a1d4888122b35f
cal-next-year = Año siguiente
# en: 1562a21cadb04e59b670cb3e32fb54f1777db699
cal-no-tasks-yet = Aún no hay tareas
# en: 3b2069a4f745374e50f8992752888822ce851db4
cal-no-tasks-yet-insert-task = Aún no hay tareas. Inserta una tarea.
# en: 855dec4a50f5117b51b7f32b59771f28855942ac
cal-nothing-on-calendar-yet-tap = Aún no hay nada en el calendario. Toca un día, o arrastra por varios.
# en: 27d7bd5f744f76fc1ad85bbe975e9fdca473eaeb
cal-nothing-this-month = Nada este mes.
# en: 46a299215300b3a0de6931f926bc6b0f2283eb99
cal-previous-month = Mes anterior
# en: 2f866c70871d37f90c24fefa28d87cc19d8850c3
cal-previous-year = Año anterior
# en: 580110a84277d369b216be5a01a5ba50868d4d3f
cal-project-plan = Plan de proyecto
# en: 6ae5ee3e66205a8b1a41c80c4db0dcc982e50f44
cal-repeats = Se repite
# en: 0a8adac9d6d5f4d14ee887d196cd8618f0f3391a
cal-schedule = Cronograma
# en: e7fe53f0503eb82f8c80f9b233fa566339a9f9e8
cal-show-times-in = Mostrar las horas en
# en: 952f375412e89ff213a8aca383d18e5691354347
cal-start = Inicio
# en: ff99f5b5f7948dfa71fd545b3d99f5f00856ea29
cal-start-date = Fecha de inicio
# en: 88d8206d586abe4c8e35c8e9adcc649d07c99a1e
cal-start-time = Hora de inicio
# en: fc612a2fcc722bde9d98ae18bea42764812b6784
cal-starts = Empieza
# en: 0e648419ea806b0cc4db81617f95870a094f3639
cal-stops = Termina
# en: 480b9be2834a2278919632171f788a9a80d5d743
cal-same-dates-as-gantt-chart = Las mismas fechas como diagrama de Gantt
# en: 7ea6dec71584012ab4044cc464dc601741ff2c50
cal-this-calendar-is-written-in = Este calendario usa la hora de { $zone }.
# en: e10c10f818ac8e510b74062cde201eae4e8d8c66
cal-this-calendar-names-no-time = Este calendario no tiene zona horaria, así que las horas se muestran en la tuya ({ $zone }).
# en: 1b4785331db3b08cd8e3cfa4bd36216731a79e54
cal-this-month = Este mes
# en: eea79afd832854a3b24153b928ee9c62c7457dbe
cal-time-zone = Zona horaria
# en: bf5efde33adface92f37d1888e904ab70c9ce272
cal-times-in-zone = Horas en { $zone }
# en: 650642b1d6b4b1ecc4ad7d38bbdf110d582c4baf
cal-times-or-on = veces, o hasta el
# en: 69bd4ef9fbd0894a22759c3766b859defbdedbc8
cal-view = Ver
# en: 97211a8888128314d9ca34d1005f08cb83ed5d9c
cal-what = Qué
# en: 879e32326c5217968ac8e3a14e4a8a5214957264
cal-year = Año
# en: 6189fbfe149a418e2f6d1af4dd71b04f6aa0c50e
cal-color-stands-for = { $color } significa
# en: 63e5df0eb2fcd351c1d31f23cdf3bf4816e3def5
cal-every-until-date = { $every } hasta el { $date }
# en: 519c383aaa892cfff62e992bb947ec79ed5dd57d
cal-every-n-times = { $every }, { $n } veces
# en: d69842d42eceddee8c62019d22d4f7ca383cf847
cal-n-days = { $n ->
        [one] un día
        [many] { $n } de días
       *[other] { $n } días
    }
# en: 0cf851711322b556de4e3e932cdf083d7444c723
cal-n-done = { $n } % hecho
# The templates: each name, then its line on the home page.
# en: 71428a822d08efae1d13babd6073592abec99d1f
cal-bakerys-posts-and-newsletters-through = Las publicaciones y boletines de una panadería durante el invierno, una historia de adviento cada día.
# en: 91dad831b9be334af672cd6052e37dedde16d06e
cal-youth-soccer-season-practice-every = Una temporada de fútbol juvenil: entrenamiento cada semana, en casa y fuera con sus colores, los playoffs.
# en: d7bad656f3b06c3ee989a1f2960214ee15b2f788
cal-small-teams-time-off-public = Los días libres de un equipo pequeño, los festivos y el cierre de Navidad en un solo calendario.
# en: cd6036648af6d0d5614f0ec65eb732300281e059
cal-community-garden-plots-year-when = El año de una parcela de huerto comunitario: cuándo sembrar, plantar, cosechar y podar, año tras año.
# en: 1b04e3c7d585a3d6297852d158919c9833538a01
cal-fall-term-from-first-day = Un trimestre de otoño desde el primer día hasta Navidad: cierres, clubes, la excursión, la reunión con las familias.
# en: f80b28faa22109c4d14cf7eb7994768abca09ca8
cal-bills-and-renewals = Facturas y renovaciones
# en: 2223281ed9222907f9d00ef35ab71df263d06e46
cal-conference-agenda = Programa de la conferencia
# en: 87695adec8581b20111f35794592bb162c32e800
cal-content-schedule = Calendario de contenidos
# en: 072b8e4f3e23cdd58cf0a4b3f5c47437127f131b
cal-editorial-calendar = Calendario editorial
# en: 26f861d8db0e97575e814ce9799eaf1bcddec28b
cal-every-autopay-on-its-day = Cada pago automático en su día de cada mes, las renovaciones anuales y los plazos de impuestos.
# en: 2185215436152ae5c1d9429385551e46587c7af8
cal-garden-calendar = Calendario del jardín
# en: 624b49bb82a8487f3ff77d2098b88b1e1ceb6695
cal-vacation-planner = Planificador de vacaciones
# en: 1ceb786961989ab69eda934e08645ecb19fe5357
cal-league-schedule = Partidos de la liga
# en: 5a94fcfb3e67abfdd4e3bab4c3d9a2683801245a
cal-school-term = Trimestre escolar
# en: 2f88af7308e60cbfbe5482a13acec0983b020e09
cal-training-plan = Plan de entrenamiento
# en: 5ef83b6b17b42f15d49c31f33e46ca8d4427e6ae
cal-twelve-weeks-to-half-marathon = Doce semanas hasta una media maratón en un cronograma: base, desarrollo, pico, puesta a punto, carrera.
# en: fdab2603fde2488e117cca6335baee3c481231b9
cal-two-days-of-talks-and = Dos días de charlas y talleres por horas, un color para cada sala.
# en: c8bbdc31a9be182914dd6207c08837389224b33a
cal-two-issues-of-quarterly-from = Dos números de una revista trimestral desde el texto hasta la venta, la reunión mensual y el lanzamiento.
# en: 0e4753002a6b042b841f5296f0cdb7c71110377b
cal-volunteer-schedule = Turnos de voluntarios
# en: f6003458ea2ce51dfa0efa7d0819ccb57ac35bd1
cal-who-does-which-shift-color = Quién hace qué turno, un color para cada persona, en un banco de alimentos antes de Navidad.

## the Diagram Maker

# en: 8737093597f4fbcf30fb6cb5d44b96f338f143c1
diagram-diagram = diagrama
# One app, eight kinds (mind map, org chart…); a 'thing' is whatever the kind is made of: an idea, a person, a step.
# en: a6c5e06888a8fcbcb520ea2a9952009715b62e25
diagram-mind-maps-org-charts-family = Mapas mentales, organigramas, árboles genealógicos, carriles, líneas del tiempo, Venn, planos de mesas y redes, dibujados a partir de unas líneas.
# en: 5c943d9da9c2dfa4508b7318865477cb55850904
diagram-empty-diagram = Un diagrama vacío
# The kinds, one of each kind's things (Insert's item), and how a line of each is written
# en: fcb9bd322ef2e2b0e304d49bdafd2842995a47e6
diagram-mind-map = Mapa mental
# en: 2cd7504a5a56c5729f37aca4d0234b698e0c0afe
diagram-org-chart = Organigrama
# en: f78fddbccd57da0c8456fd39da6c21cdc0371020
diagram-family-tree = Árbol genealógico
# en: 5a79fb6ed9e87efcbde2485d08845fe16296c303
diagram-swimlanes = Carriles
# en: 018514a3d58aa08353dd5e387ee29de45981c409
diagram-timeline = Línea del tiempo
# same
# en: e5c282f3e15ca1cf6a0b7837f7c7cd8b2bc12783
diagram-venn = Venn
# en: 840cfb1a1746bbb150371dbcf3ed341983a80c11
diagram-seating-chart = Plano de mesas
# en: 53ebc572b4a44802ba114729f07bdaaf5409a9d7
diagram-network = Red
# same
# en: bd69a4732fe12702d5ff5838852eb29e4a9e2e02
diagram-idea = Idea
# en: 8c41ae88467fe5bbad09fcd488662b25c3ec5333
diagram-person = Persona
# en: dc416e1088e4bf094dfc9abe0210e0288f5a169e
diagram-step = Paso
# en: 448ab73ba1c21e671e218fb91f2644c834f0c16f
diagram-set = Conjunto
# en: ecdda59aea5ee67d7d854c969ccf7f4f4b4a4c54
diagram-thing = Elemento
# The picture, and the line editor over a thing
# en: c2e45b49b02d2ac7e1baf25d9d0a2f5c257281ad
diagram-tap-empty-space-for-thing = Toca un espacio vacío para añadir un elemento. Para unir dos, pulsa Unir y toca ambos, o arrastra uno sobre el otro.
# en: d4b16450c157188d2cf2e3968faee3709ebeca28
diagram-tap-here-to-add-first = Toca aquí para añadir el primer elemento: { $thing }.
# en: ccdb7bfa4c6b71a69f1931253fe6f892a2baf89b
diagram-tap-in-lane-to-add = Toca en un carril para añadir un paso. Toca un paso para editarlo. Arrástralo a otro carril, o sobre un paso para que vaya después.
# en: 639d02ad26e5be80f5baf69835b953dfc015178b
diagram-tap-thing-to-join-name = Toca el elemento al que unir { $name }. Toca un espacio vacío para cancelar.
# en: 5d36f27a0649ac9ae67fb2e66f5be89ebc4719c8
diagram-tap-first-thing-to-join = Toca el primer elemento y luego el otro. Toca un espacio vacío para cancelar.
# en: 8953058d46b225514231aca0b8643f4e72547676
diagram-this-thing = Este elemento
# en: 53ea183a6bb5ad2942edd6884230b8f425c0eea6
diagram-add-under-it = Añadir debajo
# en: e9e7205b6f0bd7d9c8f1a1dfe85ef9d54979662f
diagram-add-one-more = Añadir otro
# en: be34070c33b5c14155fe70a18891828387dd399d
diagram-add-after-it = Añadir después
# en: 90d24ab49426f19e75a2b6c3fd9196603c2e0852
diagram-add-step = Añadir un paso
# en: e0d73143de80d17e82de2e017ac156ca3b9c4e01
diagram-join = Unir
# en: e45795fb6033ae4ecc1e2e3610273fce71a317d7
diagram-make-it-plain-line = Línea simple
# en: 3a4758c3cc8dac2d76026d0733816741f9b21d43
diagram-make-it-arrow = Flecha
# en: a07496767ed7e5caf20bb803434a1aa088aaa97b
diagram-what-connection-says = Etiqueta de la conexión
# en: 7d531617dd394cef59d3cf58fc32b3bc458f6744
diagram-who = Quién
# en: b48a4ad455ccc1431a4d3304864d95fb5de61df2
diagram-connection = una conexión
# en: ad87109bfff0765f4dd8cf4943b04d16a4070fea
diagram-empty = vacío
# The templates
# en: 8b0bc4ee7e0e6e592c5e8812fef8883b9cbc66de
diagram-empty-kind-to-start-from = Un diagrama en blanco ({ $kind }) para empezar.
# en: cc9cfe196eaec8bbe041a0f648039cf31df71bc7
diagram-browser-api-database-cache-and = Un navegador, una API, una base de datos, una caché y un worker, y cómo se comunican.
# en: 87796704431b42da8083f869f5ed707dae8cf8fe
diagram-building-project = Un proyecto de obra
# en: 5accd00ffa799aafee66a6e2e7a77c3e89abdd38
diagram-launch-and-everything-that-branches = Un lanzamiento y todo lo que se ramifica de él: producto, marketing, soporte.
# en: 9261260de34a3ec89f2846b1c6a53b8adc25bb35
diagram-package-through-store-warehouse-and = Un paquete a través de una tienda, un almacén y un mensajero, con una decisión.
# en: 0ef1081dd660cc404f38216048590ca0999c05d2
diagram-small-company = Una empresa pequeña
# en: 6dea73ecffb81e3db543a664a3ba6e602d58683b
diagram-wedding-dinner = Una cena de boda
# en: 1086ae322f0484af87b4a35b9537b35ad53ec68b
diagram-year-of-dates-from-plans = Un año de fechas, desde los planos aprobados hasta la apertura.
# en: c75834baf2bd8482dbb5a822f4466908244e65fa
diagram-cats-and-dogs = Gatos y perros
# en: 9e4600a93df1d0ffd290278244beed2111ac5cff
diagram-computing-briefly = La informática, en breve
# en: 4944a571da52f0920a54f002e637dfc6e179603f
diagram-fast-cheap-good = Rápido, barato, bueno
# en: 77373004b00a68bf2cad476daa1ef0af2a7e26f0
diagram-four-tables-and-who-sits = Cuatro mesas y quién se sienta en cada una.
# en: 1db47899ccb6eda1f1c46cee3c73acb1394c00ca
diagram-from-lovelace-to-now-spaced = De Lovelace a hoy, espaciado según los años, con las épocas al pie.
# en: c973a2e43350a1c09697af1bd39a17f3cfba2c36
diagram-from-order-to-doorstep = Del pedido a tu puerta
# en: 91519d37fd9fe6f0c40b0429e0ed9f8eb8206006
diagram-from-job-description-to-yes = De la descripción del puesto a un sí, carril por carril.
# en: bfd1a142e965498fd2dbaa45ca87c1cbdc9071c9
diagram-grandparents-their-children-and-grandchildren = Abuelos, sus hijos y nietos, con los años.
# en: 347a51bd3c26ccac83baeca51966f318d5bb06c4
diagram-hiring-someone = Contratar a alguien
# en: f30d75896062b87258051feec53d9f7c05059037
diagram-how-app-hangs-together = Cómo se estructura una app
# en: 70a97689961708e74a02157e6675bbcab893b7a4
diagram-seven-people-who-reports-to = Siete personas, quién depende de quién, y una línea de puntos.
# en: 45ccf051d72194e5207999d9eeabaf9311e07ec2
diagram-garden-this-year = El jardín de este año
# en: 3fa0b6c790e0b44a046fe73aa9cf77f99106074d
diagram-three-generations = Tres generaciones
# en: 206f4033c4733b2b04a85ee0de9d35b1a5acc692
diagram-three-sets-and-every-overlap = Tres conjuntos y todos sus solapamientos, con lo que pertenece a cada sitio.
# en: 762ecdafab9b2868da1121459828ec245b03ac5e
diagram-two-sets-and-what-they = Dos conjuntos y lo que comparten.
# en: f02e532d172e25cb200306e2edda8e4331418dcd
diagram-what-to-grow-and-jobs = Qué cultivar y las tareas por hacer, como mapa mental.
# en: a6847567865dbe1e5266bbcd7f1f4e0049ee9eb1
diagram-biology-final-in-december-topic = Un examen final de biología en diciembre, tema por tema, y cómo se hace el estudio.
# en: e32c422ee266430ea9dd0cd2cc78750a1342302a
diagram-classroom = Un aula
# en: e491ee6c30111d9c51d83d4a19aba47a3c39c769
diagram-family-with-godmother = Una familia con una madrina
# en: c164cf0f878062c2b43b69bf4c1de2c3d6a1f94d
diagram-principal-her-assistant-principals-classroom = Una directora, sus subdirectores, los maestros y el conserje.
# en: f25d2f240d3a52d5361d9b6dd4d8561290566159
diagram-move-to-lisbon-by-march = Una mudanza a Lisboa para marzo: papeles, un apartamento, trabajo y vida, y qué tiene que ir primero.
# en: d2586903dd907f55b8076edbe00b87f4e45ab92f
diagram-elementary-school = Una escuela primaria
# en: 3eff234615aa3d538d44f11142e266d62b44ef43
diagram-restaurant-kitchen = La cocina de un restaurante
# en: 3fecd5a70de57bb7748a775d7d4c6072bace1e50
diagram-router-and-everything-on-it = Un router y todo lo que hay conectado: portátil, teléfono, impresora, televisión y timbre.
# en: 949c596fb3177561b6f2515cbc92b6b68a4292c2
diagram-team-by-its-skills-design = Un equipo por sus habilidades: diseño, redacción y código, y quién hace más de una cosa.
# en: eeb20483d989d9deef42a5ae150f171af0bc6201
diagram-expense-report = Un informe de gastos
# en: ded9774849cab88a3dd08936595ffe270dd397a2
diagram-apollo-11 = Apolo 11
# en: b5723994f111884ca2f9a82ecb525fb6992e44c8
diagram-board-game-night = Noche de juegos de mesa
# en: d69e423520fc900afc06f3d31ab286694fb7d67b
diagram-class-4b-at-four-tables = La clase 4B en cuatro mesas por colores, y el rincón de lectura.
# en: d8d0862686b742040e32f8f3235084ad61fcef28
diagram-eight-days-in-july-1969 = Ocho días de julio de 1969, día a día, del lanzamiento al amerizaje.
# en: ce31ba59543ea424a6019bc67976ace141d62d09
diagram-four-games-table-each-and = Cuatro juegos, una mesa cada uno, y quién juega a qué.
# en: 9d35a9836a6bb4c6180f6c2880c8c19c22ed4ea0
diagram-from-photo-of-receipt-to = De la foto del recibo a la nómina, pasando por un jefe y finanzas.
# en: 1f1489585228c4bf2d9599bdff9fef70f59b4a60
diagram-moving-abroad = Mudarse al extranjero
# en: a04755781fd967ec44d2f47f1ebf6ff83b2fe909
diagram-patrick-and-maria-their-six = Patrick y Maria, sus seis hijos con los años que vivieron, y la tía que los crio.
# en: 56aa5ec3b6a5e62a57ce1e1223c5f1f8148a7e02
diagram-studying-for-exam = Estudiar para un examen
# en: d7cda8e6bd3d07fe1968c61d6b068203911ae45c
diagram-sea-clouds-mountains-rivers-groundwater = Mar, nubes, montañas, ríos, aguas subterráneas y plantas, y cómo se mueve el agua entre ellos.
# en: a1da7a04adf4a0189219b39bddb2518c44ba382f
diagram-brontes = Las Brontë
# en: 0c2311a818005e4508a11aa6a888f61a45bd9a3b
diagram-brigade-under-head-chef-front = La brigada bajo el jefe de cocina, con el salón al lado.
# en: 0c62114de8628cfe00011bba9cc35f003279ac83
diagram-house-network = La red de la casa
# en: 1fcf7cc436a073faa316df56cf1a4d3ec2b87d6e
diagram-water-cycle = El ciclo del agua
# en: cdb628c70ae8584f4098828ec8a65f19d44697b8
diagram-three-generations-of-morenos-and = Tres generaciones de los Moreno, y una línea de puntos hacia un ahijado.
# en: 0e60bdf5cc3dbaa6c2018bd31c760c1e46e79ab1
diagram-who-can-do-what = Quién puede hacer qué
# en: b27a04f87f9d4657107a8dbd89d32eb1dedb41b7
diagram-tap-empty-space-for-branch = Toca un espacio vacío para añadir una rama. Toca una idea para editarla, Enter para la siguiente. Arrastra una sobre otra para anidarla. Unir conecta dos de un lado a otro del mapa.
# en: fd23500d007e121f9530bb8b530f367ed9e00825
diagram-place-cards = Tarjetas de mesa
# en: dd9ef7db14a8bdb18f7a266d6e91711443e71a29
diagram-print-place-cards = Imprimir tarjetas de mesa
# en: 030e26916d4c1d1ca0c41b3b447dde54ed891dbd
diagram-print-place-cards-card-guest = Imprimir tarjetas de mesa: una tarjeta por invitado, ocho por hoja carta, para recortar
# en: face83ee3014bdc8f98203cc94e2e89222452e90
diagram-guest = Invitado
# en: 5734dbf560e03e0dea1a1bd85af5088238d5d0e4
diagram-new-idea = Idea nueva
# en: 32c6bde8aa4d539c3b773b1f4cf66e15aa427faa
diagram-tap-empty-space-for-person = Toca un espacio vacío para añadir a una persona. Toca a una para editarla, Shift+Enter para su cargo, Enter para la siguiente. Arrastra a una sobre otra para ponerla debajo.
# en: 5f7463cc9e2e8a2e25990127091710a286d9765a
diagram-tap-empty-space-for-event = Toca un espacio vacío para añadir un evento. Escribe la fecha, Shift+Enter y luego lo que pasó. Las fechas se espacian a escala, y un intervalo se ve como una banda.
# en: b6395077670d276b6a207a6eadb6f5a17c1fa854
diagram-lanes-name = El nombre del carril
# en: 769bb19e615b7f8e2809e5882e2d05a18f57a531
diagram-when = Cuándo
# en: b23ea75ecf303b9756682c84abecebc7a010f2b1
diagram-tap-person-to-type-on = Toca a una persona para editarla. Añade + y un nombre para su pareja, Shift+Enter para los años, Enter para la siguiente. Arrastra a una sobre otra para ponerla debajo. Unir traza una línea punteada.
# en: 14e56ce6d5f3d8d56d2ce979bf2eb20aaa9dd93d
diagram-tap-empty-space-for-table = Toca un espacio vacío para añadir una mesa. Toca una mesa o a una persona para editar. Una coma empieza el siguiente invitado. Arrastra a una persona a otra mesa.
# en: 7049f105f3a76be9cb8c6d7b74eb3edf60d9a7da
diagram-tap-inside-circles-to-add = Toca dentro de un círculo para añadir un elemento. Una coma empieza el siguiente. Toca el nombre de un conjunto para cambiarlo. Arrastra un elemento entre círculos.

## the Trip Planner

# en: fdd91fbac0e5654a70026a229cc8a5d869157b24
trip-trip = viaje
# A stop is a place on the route; { $n } is its number, { $time } a drive such as "1 hr 38 min". 'Trip Planner' and 'Plan' are above.
# en: 46644fef83a4f92870b2bda5079d97dae8b05b1f
trip-route-on-map-stops-in = Una ruta en un mapa: paradas en orden, cada una con una nota, y la distancia entre ellas.
# en: 199cd6e4be673dbec0dfaaa645071e949f5480cc
trip-gpx-route = Ruta GPX
# same
# en: 97eeda258d4d0c87a81a7741038e625eda23a2a6
trip-geojson = GeoJSON
# The bar and the map
# en: 63746c80a9900aa0b9df832d6fe50b7318a88aab
trip-a-place-by-name = Un lugar por nombre…
# en: c86d6e7640906afe6a57236c004f0b1af53b6ee8
trip-stop-at-middle-of-map = Parada en el centro del mapa
# en: a52fccf0e1e5beca9d5885f1638d5e9a6a2684f9
trip-measure-in = Medir en
# en: 2458f1444290ced8aefad04d5c947b17bf9a81fb
trip-hours-of-driving = Horas de conducción
# en: 5fa6c4032be31076212eb57f2fe6ba44d445d501
trip-miles = Millas
# en: 87bafdbb82c61625882d74515ef2c7e566177ea5
trip-kilometers = Kilómetros
# en: 8e49f86b47ba8e4ac259af7b5428623e7332489c
trip-join-stops-in-order = Unir las paradas en orden
# en: 7bdcf970899e9519b75f2dc24d1909f670b283cb
trip-show-whole-route = Mostrar toda la ruta
# en: fa157c9ab413b3c415d7ada7457694a35c7869a1
trip-where-i-am = Dónde estoy
# en: ab478f3efc840eebab919dff1b9512286f70c10c
trip-map = Mapa
# en: 4fa4643900d7a129558f6c34b681a8d419a9ef9d
trip-map-tap-to-add-stop = Mapa: toca para añadir una parada
# en: a481372d94c5d404a0bd0a597cda747c83e952a4
trip-map-comes-from-openfreemap = Las teselas del mapa se cargan desde OpenFreeMap mientras el mapa está abierto.
# en: dd1ac7c6150bf40973c618ac841d01f2281dea20
trip-your-location-is-asked-for = Tu ubicación solo se usa para centrar el mapa y nunca se guarda.
# en: 6c4827a34debc3c12e8a905f5e8025f0d22802cb
trip-n-stops = { $n ->
        [one] una parada
        [many] { $n } de paradas
       *[other] { $n } paradas
    }
# en: 44896c642dce2a144eb35fdb61cedb762cc44ca1
trip-stop-n = Parada { $n }
# A stop's number is its handle; the bar under stops chosen whole.
# en: 372c19ab2c53f7582cdbe3823523a8760d0f2807
trip-stop-n-tap-chooses-it = Parada { $n }: toca para seleccionar, arrastra para mover
# en: 56f844200d56e1fc382c81f28972a39aab61e019
trip-chosen-stops = Paradas seleccionadas
# en: 0e648419ea806b0cc4db81617f95870a094f3639
trip-stops = Paradas
# en: a9d55cf1a8a7b85ab9e293fc1e40a440986b0725
trip-show-on-map = Mostrar en el mapa
# en: bdea0edfea6bebf4baf952432856faf7b3f43890
trip-name-of-stop-n = Nombre de la parada { $n }
# en: 4dad38541848da253722328a5517dffdda35b4ab
trip-note-for-stop-n = Nota de la parada { $n }
# en: 0a8abf5522e2f20b1f976982533aabd909645324
trip-about-time-by-car = unos { $time } en coche
# en: 7f85e32db6c77473c8b172d1ad1dab75462705a3
trip-tap-map-to-add-first = Toca el mapa para añadir la primera parada o busca un lugar por nombre en Insertar.
# en: 472fd6a8979384a06de401f16cafb9cfdd9a824c
trip-insert-place-by-name = Busca un lugar por nombre en Insertar.
# Finding a place by name
# en: b75a19207f834200f4801a2db37886567baf25bc
trip-place-by-name = Un lugar por nombre
# en: 7d7388a1d59910888c95c66fed24ad82cb5edbf2
trip-find-place = Buscar un lugar
# en: 57d3470391ec96a8442196a4ff85cf39e4f65e98
trip-town-address-museum = Una ciudad, una dirección, un museo
# en: bce06414177f72ab70e6387b6af9f8ceef0d6049
trip-search = Buscar
# en: 1a6a5ba8c23ddb672874a2996abaee1fe933abcd
trip-searching = Buscando…
# en: 07a4d61733e108a8ffa6e5753e09227b6a1a0f80
trip-searching-sends-words-you-type = La búsqueda solo envía lo que escribes a Nominatim, de OpenStreetMap.
# en: 2b36ec5f26fb5c35fccb5edd05776349d238b677
trip-places-found = Lugares encontrados
# en: 6c70807e19d1f88aae7d66770719debbaf4ae89b
trip-nothing-found = No se encontró nada.
# The templates
# en: ce482808305f25f4c7f63905061b0c411444f12c
trip-week-in-portugal = Una semana en Portugal
# en: 3a4002be5f16560bb462d3f37d8b2caac8a65603
trip-lisbon-to-porto-by-car = De Lisboa a Oporto en coche, en kilómetros, un consejo en cada parada.
# en: 72fa00e64f1816bfe62cd5e5ebae7ddd8bbc1d59
trip-down-pacific-coast = Por la costa del Pacífico
# en: 6d871c8c9ed845cfaaafff0c18e335ce6da9ba42
trip-san-francisco-to-los-angeles = De San Francisco a Los Ángeles por la Highway 1, en millas.
# en: 8396776ccda695ac7d6e5f12a1eaa4dd3edecfac
trip-scottish-highlands = Las Tierras Altas de Escocia
# en: 7a3f06a64060636652afe5912e0a00016bc3d17f
trip-loop-from-edinburgh-each-leg = Una vuelta desde Edimburgo, cada tramo en horas de conducción.
# en: 9660e47a7aad398fbc88947cd22e8628b2a92115
trip-rome-places-to-see = Roma, los lugares que ver
# en: f01c658cc1c5b1dbfba8045b885174d2f5a3d154
trip-places-as-dots-not-route = Lugares como puntos, no una ruta: qué ver y cuándo ir.
# en: e50e4931f42687faef4a226f93981bb38a937ce9
trip-weekend-in-copenhagen = Un fin de semana en Copenhague
# en: 402e0be1180f76470536e904cec4f7242211bb15
trip-friday-night-to-sundays-train = Del viernes por la noche al tren del domingo, a pie, en kilómetros.
# en: a5594e90d42f49b6ce9e2842193b64f380d1a10c
trip-icelands-ring-road = La Ring Road de Islandia
# en: b237aa87bc63dccebef93e19a8ef785d96ba69ce
trip-ten-days-around-island-by = Diez días alrededor de la isla en coche, cada tramo en horas de conducción.
# en: 89059cee91b704cf1c0e42de4225df2968a207e7
trip-dublin-food-crawl = Una ruta gastronómica por Dublín
# en: b934fa6dfc063b38e47ce12ed4622e1cc0d55b75
trip-seven-places-to-eat-in = Siete sitios para comer en una tarde, de oeste a este, con un paseo corto entre cada uno.
# en: 2149c2c628bda1d9ea8522144f7ca59ce2a6bcc8
trip-yosemites-mist-trail-loop = La ruta Mist Trail de Yosemite
# en: 056b43a68d915001b02640fbb4ec910045a406ad
trip-two-waterfalls-on-day-hike = Dos cascadas en una excursión de un día desde Happy Isles y vuelta, en millas.
# en: b1365d430388f423cf7142e4a78c7470fed8a5fc
trip-loire-by-bike = El Loira en bicicleta
# en: e0fc4a0bf8e42cf48f5f6825bc3b8420df625254
trip-orleans-to-saumur-in-six = De Orleans a Saumur en seis días, de castillo en castillo, en kilómetros.
# en: e68d998a80765bfa302dd2b477f31c97db0d51d2
trip-college-tour = Una gira de universidades
# en: 02b9d4cf509b27e9011826d208a7831782bb08a6
trip-six-campuses-in-new-england = Seis campus de Nueva Inglaterra en una semana, con una visita reservada en cada uno.
# en: 651b0f889a962febf3a80370511cbc08abac73da
trip-japan-by-rail = Japón en tren
# en: f687060ca9b759a7ed4bca61f7a2bf96764f2f8e
trip-tokyo-to-miyajima-in-cherry = De Tokio a Miyajima con los cerezos en flor, en tren bala.
# en: afea6c128d27238aad4e11871dfff6f692334301
trip-last-100-km-of-camino = Los últimos 100 km del Camino
# en: 33d01f381424bbc8bbd1b6a9487b3a53c38d07e9
trip-sarria-to-santiago-on-foot = De Sarria a Santiago a pie, una etapa al día.
# en: b15aca8406aa957e0b92331f3c94b96775672e6b
trip-new-york-in-movies = Nueva York en el cine
# en: cdd506e6983757bd11c62cbbe6a0acbbd4002303
trip-seven-film-and-tv-locations = Siete localizaciones de cine y televisión, del norte al sur de la ciudad, en un día.
# en: 2cf068b9c859d837fbc257f1dc20a64d0d96b2b0
trip-wedding-on-lake-como = Una boda en el lago de Como
# en: a3dec1f6e3f5856eb26a70a9c329744d499a1afc
trip-for-guests-where-wedding-is = Para los invitados: dónde es la boda, dónde dormir, cómo llegar.
# en: 0fbbb28a6e64acfee9300ecf05016dcf149a5a19
trip-presenting-trip = Presentando el viaje
# en: 24848d1e92a4b831f8fdae547c2fbfdc0d1e441b
trip-presenting-next-stop = Siguiente parada (presentando)
# en: a802f6e93c981ee6dd02df366f0141ca3aa085e0
trip-presenting-stop-before = Parada anterior (presentando)
# en: 3b14d20764a1fdef5ee74f4defab4ff20b0e7cce
trip-put-stops-on-calendar-day = Poner las paradas en un calendario, un día cada una
# en: 16fa5ad4958332a6bbb1eae6d1a8c6ee6f2c7752
trip-first-last = Primera o última
# en: 0aa341109cff3c75e204930fdeac94f52278bb67
trip-next-stop = Siguiente parada
# en: 35bc0362a4899961a0e878990611c13021c1e549
trip-stop-before = Parada anterior

## shared: the Word Processor's looks, the header's Home, a money column's currency

# en: 958de540438a0fa530d47d2c072d0d9c22cd2af5
looks-typewriter = Máquina de escribir
# same
# en: a5c78a86fab1c02cd981c23b8bad5dad3e7438e3
looks-serif = Serif
# en: 70f8bb9a8a5393ef080507a89e4b98d139000d65
common-home = Inicio
# en: e070de224434a2acd352b35cec46f34f9e08e1b2
looks-currency = Moneda

## the Calculator app

# en: a0015ec89d8034b2ca4a8f0219350514e19294a0
calc-calculation = cálculo
# The tape is the list of lines worked out, as on a printing calculator. 'Calculator' and 'Numbers' are above.
# en: ab4ea6f8fe06812a128297560bee7aff1be0c040
calc-calculator-that-shows-its-work = Una calculadora que muestra sus cálculos: nombres, unidades y conversiones, y gráficas de y = f(x).
# en: f146f8e93fc9312f6b8003b048cd24d1574469af
calc-tape-text = Cinta como texto
# The bar
# en: 9a7405ebcedde5be8d095a986ea8794e19ee84e2
calc-graph = Gráfica
# en: a3310f1f9bbb12cd753850392faec8453a10c709
calc-clear-tape = Borrar la cinta
# en: 14a09e767bb648a339ba82fb609c02f3d9aa4228
calc-clear-graph = Borrar la gráfica
# Insert: functions, and what the second engine reads
# en: 2b961dea1dc0c60ddf9a2c8e9d090f6f7d082483
calc-functions = Funciones
# en: ca0c5d6d0a40f5f2e6f47ee8fc8b934a3eece03f
calc-sine = Seno
# en: c1951ad44359d27f765c0f1c7bfea678577a3fb1
calc-cosine = Coseno
# en: 7ef1446b5f4ac08a82f28ef66bf019af3ed9c3c5
calc-tangent = Tangente
# en: f90781f1beba7ea766ef6fddf4672221c99da01f
calc-natural-log = Logaritmo natural
# en: c4607860d3bb073b2fe96de25c2566b33f6e5610
calc-log-base-ten = Logaritmo en base diez
# en: 47a3278f023594b94c900b5d792366be2e8b3d39
calc-square-root = Raíz cuadrada
# en: 35e4a1a9ace5e53c1521b13130f3b1fce0bb312b
calc-absolute-value = Valor absoluto
# same
# en: 8e4e872b30d442c4d7f1edf2cabdff971300b607
calc-factorial = Factorial
# en: c584662e0778e58334ec2e9f7fc7f58a98d4dca8
calc-e-number = e, el número
# en: f3afae23c74a7d1a42a52c0c47bfeb1191b6b6e9
calc-x-for-graph = x, para una gráfica
# en: 1cfd7bfc7d3d79d7ea28a91bdc6e032559103831
calc-units-and-algebra = Unidades y álgebra
# en: de1e4faaa9758db564ba458c3956824881efcd9c
calc-convert-to = Convertir a
# en: 95562b515314072f0bc7658aa71f2ef77371d893
calc-derivative = Derivada
# en: 965a00d9ba9665ad57ca3edefdcca07a61d3ca95
calc-simplify = Simplificar
# The tape, the line being typed, the keys; { $answer } is a result such as 42 or 7.62 cm
# en: c51c55b719457118a73f5732f4dd4772aaba2e20
calc-tape = Cinta
# en: 1acb1c0448ace57b632dc2d56121f45a18e646be
calc-line-n = Línea { $n }
# en: 43885eadc7bc789d89e6e81db680818d2dd1b223
calc-put-answer-in-line = Insertar { $answer }
# en: a9c16dd084ce3781568419133b0fa0c0f57aa727
calc-no-answer = Sin respuesta
# en: cf23123f857abeda1d28fc9b85cc7eba8d20f3b1
calc-take-away-line-n = Eliminar la línea { $n }
# en: fc9ce14b28c6f2c3b72caf056ca604b2b96f7d2b
calc-sum = Suma
# en: fdb6ecce95257d64ccde93310bf9a9adc8ad249e
calc-type-or-tap = Escribe o toca
# same
# en: e1745e3e21e84b24c379af6f45a18e1a21e56577
calc-y = y =
# same
# en: 97e60be18b1afcca3cde2fc6df4343208cefb0a1
calc-y-equals-ellipsis = y = …
# en: 71f2d6a97665cb72b50a6384a06af3e014b96db5
calc-at-x-1-answer = en x = 1: { $answer }
# en: e5651c683f14c95aa972cfdbc300d9fecfe02019
calc-keys = Teclas
# en: 88d130a66de8e5db01660642d9f23e1f0eef97dd
calc-backspace = Retroceso
# en: d1149c36a0edcfbeae98bf270da3f543b6c6a866
calc-clear-line = Borrar la línea
# en: 097a41c8c7e58b9b655d7b3e31a3673466595450
calc-answer-before = Resultado anterior
# en: 2ee9e26d39d7113bd8fea80639d6257ab1bdf8cc
calc-type-sum-or-3-inch = Escribe un cálculo, o 3 inch to cm, y pulsa Enter. a = 12 guarda un resultado con nombre.
# en: 0bef86b24e006bd994db1509b268156522c7dc2c
calc-type-curve-in-x-such = Escribe una curva en x, como x^2 o sin(x), y pulsa Enter para dibujarla.
# The templates
# en: bcb584ffecef3a17141a771a3ceedbbe6d474ca1
calc-splitting-bill = Dividir la cuenta
# en: 0a45fc60c975ea141733f982179ead17af8767b6
calc-food-drinks-and-18-tip = Comida, bebida y una propina del 18 %, repartidas entre seis, cada paso guardado con nombre.
# en: 2c9e678b58314997051ff2c13d56c92ea6bce7d7
calc-shopping-total = Un total de la compra
# en: d8719443b912bfaadd4f5d8fb2f1fc095f58ff52
calc-tape-of-market-apples-and = Una cinta del mercado: manzanas y queso por peso, el total, y el cambio de $60.
# en: 56d12d641f4f4177e63e120c8bd10a8e7348357f
calc-tax-on-price = Impuesto sobre un precio
# en: 8a7d0a08d1e03c2974f84aa039e7871c5b232245
calc-new-york-city-sales-tax = El impuesto sobre las ventas de Nueva York sumado a un precio, y restado de un recibo.
# en: 80296be8eee3142eb634c0045f82e15b5e5373aa
calc-percentage-change = Cambio porcentual
# en: 93650e756cc879e41310d678219f483e5ce2cfd1
calc-rent-up-from-1-450 = El alquiler sube de $1,450 a $1,595: cuánto, qué porcentaje, y frente a un aumento de sueldo.
# en: 9ff9fc7e0344944578d50820e0326f7bf34f1c8e
calc-kitchen-conversions = Conversiones de cocina
# en: c7ccdb52f144fcec56adb8ecb5264f35d03600c0
calc-cups-ovens-spoons-and-weights = Tazas, temperaturas del horno, cucharas y pesos, de una medida a otra.
# en: 267b3d4696b05cc65039fcf4afb8cd9548ed5a29
calc-scaling-recipe = Escalar una receta
# en: a0e9dcbc29ed1364a4891c3671dd43675af64d11
calc-banana-bread-for-eight-made = Un pan de plátano para ocho hecho para doce: cada cantidad por uno y medio.
# en: 8639704eb84800c829b41e6fcd833d686dcb41f6
calc-unit-conversions = Conversión de unidades
# en: 2aef2060ccb74d32576f5b1f936372bdd97252f3
calc-feet-to-centimeters-miles-to = De pies a centímetros, de millas a kilómetros, de libras a kilogramos, de Fahrenheit a Celsius.
# en: 7b31203b4780df1cd410c84049ed4d031dacc8e3
calc-currency-at-rate-you-type = Divisas a la tasa que indiques
# en: 5f4e47693383fd619db1b39871b821a7fccf86df
calc-trip-priced-in-euros-and = Un viaje presupuestado en euros y pasado a dólares, más la comisión de la tarjeta.
# en: 6645ae7e46c209b7ba6f5fb3b6aa707395a2c3d2
calc-fuel-for-trip = Combustible para un viaje
# en: e2d3235c5cfd9ceffb4e54f0635e4f3841b0c0e1
calc-boston-to-montreal-and-back = De Boston a Montreal y vuelta: millas, millas por galón, el precio, de cuatro maneras.
# en: bb294d581aa3512dfdaf06cb5705338f026425ff
calc-paint-for-room = Pintura para una habitación
# en: 8899142eaeb03e3a2cfc17f5e68f1977478e2ce5
calc-walls-less-door-and-windows = Las paredes menos la puerta y las ventanas, dos manos, en latas de un galón.
# en: fa9aac4028931969e4e43d5926f21c1c02b03737
calc-time-zones = Husos horarios
# en: daa6b831387e404e18a932466e1b26486e942c1b
calc-one-call-at-9-in = Una llamada a las 9 en Nueva York, y la hora que es en Londres, Berlín, Bombay, Tokio y Sídney.
# en: 4126383a0888802d508caf9f1e9a973554c6eb7e
calc-running-pace = Ritmo de carrera
# en: 73e59d9404aa7a32f2e7e9ae9ff609c2a74d14cb
calc-10k-in-52-30-minutes = Una carrera de 10 km en 52:30: minutos por kilómetro y por milla, y la media maratón y el maratón a ese ritmo.
# en: d1411ae3cdd27fda5ea57577c408be223f586cf0
calc-body-mass-index = Índice de masa corporal
# en: cf37a053ab6daf8527ff908a4479b6fb38654155
calc-weight-over-height-squared-in = Peso entre altura al cuadrado, en kilogramos y metros o en libras y pulgadas.
# en: 18c8c5aa1c31cb796ef6aa8086b794bc59e4d454
calc-dose-by-weight = Dosis por peso
# en: a2cdd7739e2ff2b4f1ee78074c5c7981d1b877f9
calc-milligrams-kilogram-turned-into-milliliters = Miligramos por kilogramo, pasados a mililitros de un jarabe; comprueba cada dosis con un farmacéutico.
# en: 4699da98e2d343e04aa2465082aedd4d5053aa11
calc-electricity-for-appliance = Electricidad de un electrodoméstico
# en: d1b1126c73c13b523ce30bd2f563ad1a7b1c0210
calc-watts-hours-day-and-price = Vatios, horas al día y el precio de un kilovatio hora: lo que cuesta una estufa al mes.
# en: 96aeea666f6bd696d83ef3dee80fff1fcc3ff896
calc-loan-payment = Cuota de un préstamo
# en: 9c2f158098b8fc30f79ae0d1db9391a68d8aea9a
calc-24-000-at-6-9 = $24,000 al 6.9 % a sesenta meses: la cuota mensual y los intereses en total.
# en: 3c48bd272b7ad823e277ca649218ae107832bca4
calc-compound-interest = Interés compuesto
# en: ce79ef1a5e051c360028ef440ccc8258554abe0a
calc-5-000-and-200-month = $5,000 y $200 al mes al 5 % durante diez años, frente a lo aportado.
# en: 813161b07c2ed5cab82b09f8c31b3810800bcd26
calc-break-even = Punto de equilibrio
# en: bee9b48a097d165fe0d11f7c3a7175019c158c5e
calc-costs-against-sales-for-coffee = Costos frente a ingresos de un carrito de café: donde se cruzan las líneas están los cafés al día que necesita.
# en: a9047269b4f64dbbb2df8503315406b2b33fc4e9
calc-curve-and-its-slope = Una curva y su pendiente
# en: b5f43817a99082555a1fc4891fd2eb5bfaba6e10
calc-x3-3x-its-derivative-and = x³ − 3x, su derivada y la tangente horizontal en el mínimo.
# en: d4802215f2c0025bd9e3f3fe025230ceda4e830b
calc-waves-adding-up = Ondas que se suman
# en: 9e46b2d75638fb2ebe905ad0c4be8059be6487cc
calc-sine-waves-summed-on-their = Ondas senoidales sumadas, camino de una onda cuadrada.
# The grip on a line of the tape; the bar under lines chosen whole.
# en: fd71cff4626f555a0e69c5b6801a591cabd1d173
calc-choose-line-n-drag-it = Seleccionar la línea { $n }, arrastrar para mover
# en: dab2e3d9cf8c3bfccd20fa34fac6fc738ce9aba7
calc-chosen-lines = Líneas seleccionadas

## two links compared (kit/ui/compare.ts)

# en: 8aa57de6dce6ee1c35c6aba7426503281876b258
compare-changes = Cambios
# en: 8d105cf44d3926289e65c1c83d8e37cb23fd049e
compare-compare = Comparar
# en: 24512a18bc6d2c27213ad28b26ce9271d94175af
compare-no-difference = Sin diferencias
# en: 8f0fb2d2ece91d9de4ed64f23a12b475c3e18970
compare-not-link-to-tiny-little = No es un enlace a un documento de Oficinita Diminuta
# en: e82be1221a13b593fd3fd58ffe24f3c3ba58f783
compare-paste-second-link-to-see = Pega un segundo enlace para ver qué cambió.
# en: 442aef6fc360061295985657c4489b3c4d360cc3
compare-paste-link-to-document-as = Pega el enlace al documento tal como está ahora
# en: 7fb07fcb91ba19442009f16f24be4ef85b3eca16
compare-paste-link-to-document-as-it-was = Pega el enlace al documento tal como estaba
# en: 0ae84aa126111ee639f685e9ed05c6895e632a90
compare-put-in = Añadido:
# en: 210dd62a81e43d19e22018878ba665485e0526cb
compare-swap = Intercambiar
# en: c331654dfaed937af3dc0e72f31b21fdfb1aa325
compare-taken-out = Quitado:
# en: aec0a618ef67ca171ab77615fc7cab57405fea3f
compare-first-link = El primer enlace
# en: 123bc4a6d63cd1415119c84ed21412a29ef9fbcc
compare-second-link = El segundo enlace
# en: 010030de6a30e85dd769e07201d8373ebff655c8
compare-two-links-to-documents-side = Dos enlaces a documentos, uno junto al otro: se marca lo que cambió el segundo. Nada sale de esta página.
# en: 2053662dff5d94e9ea30321321ce6cd0df8f0027
compare-different-apps = aplicaciones distintas
# en: f4e4b3a1d739ce43635eb9d75d97403c420c0642
compare-n-blocks-taken-out = { $n ->
        [one] { $n } bloque quitado
        [many] { $n } de bloques quitados
       *[other] { $n } bloques quitados
    }
# en: 0041ce2f8795b8fbc93244ba17b668d115906ef3
compare-n-put-in = { $n ->
        [one] { $n } añadido
        [many] { $n } de añadidos
       *[other] { $n } añadidos
    }

## files and zips dropped on the page (kit/file/open.ts)

# en: c99db7abba3f7227854d93a163ad3494de4e1571
open-opened-name = Se abrió { $name }
# en: f917dee4211bd4af58db8efec79e354e1ffb4912
open-that-file-is-not-words = Oficinita Diminuta no puede leer ese archivo.
# en: 1d08903947cc83b648f8ad96b1e23466a2dbed11
open-that-file-is-too-large = Ese archivo es demasiado grande.
# en: 8f432852569edbf7610713a6554e7a61396327d5
open-keep-them-on-this-device = Guardarlos en este dispositivo
# en: c4fe6d8b035f6108e8a7e0037667dacf3d6cca25
open-nothing-is-saved-on-this = No hay nada guardado en este dispositivo. Guárdalos aquí o abre uno.
# en: 0826daee1d616f7de3a2b205eb2360fcaccc77ef
open-first = Abrir el primero
# en: 59d36bf6c42ab3ae1481fe62abbc67ffef7a8b22
open-saving-in-this-browser-n = Guardando en este navegador: { $n ->
        [one] { $n } documento guardado
        [many] { $n } de documentos guardados
       *[other] { $n } documentos guardados
    }
# en: 4fc6621d5b53d413dd1fd42cf7e7834ee3ecba5a
open-that-zip-holds-no-documents = No se encontraron documentos legibles en ese zip.
# en: ed5d2e1ab481efa92392820d83922b25c236c730
open-n-documents-kept = { $n ->
        [one] { $n } documento guardado
        [many] { $n } de documentos guardados
       *[other] { $n } documentos guardados
    }

## a document's QR code (kit/draw/qr-picture.ts)

# Restored around the document: search, Find in this document, the shortcuts and the apps' keys, Mod+S, the size of
# everything, Add to home screen, another version kept here, where the link fits, Open in another app, the QR code
# of this document, Insert narrowed by typing, Trip presenting, a seating chart's place cards
# en: 775db36d459744f2dc73dcb147ab032f4b6f4a09
qr-code-of-this-document = Un código QR de este documento

## the keys, the shortcuts and the size of everything (kit/core/keys.ts, kit/ui/zoom.ts)

# en: e5737972ceac5c184d5009e9ee1746c4b3292f26
keys-normal-size = Restablecer zoom
# en: 4fc05f2763ba31e2d3be5f08e7d0bab5d5dcbf78
keys-everything-larger = Acercar
# en: a4ae4b24a1f5369c2bff61abdbc221170e4b27d8
keys-everything-smaller = Alejar
# en: 67312061f24800b7dc75b07101329959c5c1af88
keys-keep-this-document-on-device = Guardar en este dispositivo
# en: 4d5e11a737e63d755f4127a0139f235f3794b6c6
keys-show-these-shortcuts = Mostrar estos atajos
# en: da05037a43419e15395f52f0ed4dcb0c7f75c1f2
keys-this-page = Esta página

## Find in this document (kit/ui/find.ts)

# en: 475c848673a3f79fa778f01c2bd5a721d4c41707
find-not-found = No se encontró

## a menu narrowed by typing (kit/ui/menu.ts)

# en: a9c25fead588babdd6b90b343a47f716f722312e
menu-nothing-starts-q = Sin coincidencias para «{ $q }»
# en: ddf17f8747a6b36489443d6b09c25b429a1ea675
menu-starting-q = Coincidencias para «{ $q }»


## a host's own pages: its table, its search, its header (kit/ui/table.ts, kit/ui/search-box.ts, kit/ui/header.ts)

# en: 4816c01fcfc82e618ba8d4f9f2d5cca84f36a4c1
table-filter-rows = Filtrar filas
# en: f648af13b3a158a514634b7a27501c621e4f9c87
table-add-row = Añadir fila
# en: 45b553017087942f58e36f1963f58398aaa93cef
table-select-all-rows = Seleccionar todas las filas
# en: 9320afbefdcf309b4b763224769937b3936d517a
table-select-name = Seleccionar { $name }
# en: e892255d168b0ccc00b895b653a7ff8d9a7ab4f0
table-no-rows = Aún no hay nada
# en: 7dc03a2b77e86b5ce3279f1239cf7eed2c3e31dd
table-no-rows-match = Ninguna fila coincide
# en: fc6c0582fa83a05374d53d05a9e4fbd9a76f7adc
table-sort-hint = Ordenar por esta columna. Mayús+clic para ordenar también por ella.
# en: bce06414177f72ab70e6387b6af9f8ceef0d6049
search-label = Buscar
# en: 1a6a5ba8c23ddb672874a2996abaee1fe933abcd
search-searching = Buscando…
# en: 938206ae8c35210570eff0f625f7174736ab50d3
search-failed = La búsqueda no funcionó. Inténtalo de nuevo.
# en: 445b04c118dbe3becf81b1490e4f09218cd85a09
search-n-found = { $n ->
        [one] { $n } resultado
        [many] { $n } de resultados
       *[other] { $n } resultados
    }
# en: 1c8d7da8241f46e35847a6ee94585aa15c895038
search-nothing-found = Sin coincidencias para «{ $q }»
# en: 0ecef6f95577e3e82d8917d2d3e89d1aa83afd09
header-breadcrumbs = Ruta de navegación