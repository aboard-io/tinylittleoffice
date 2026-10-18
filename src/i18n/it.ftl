### Le stringhe in italiano: ogni testo che una persona vede, con l’identificativo a sinistra del «=» e le parole
### in italiano a destra. Gli identificativi, le { $variabili } e i gruppi seguono en.ftl; in un plurale
### l’italiano ha tre forme: one (una), many (milioni), other (altre).

## the shell: header

# same
# en: 57f5f5efbc5990f5230aa95359042338b856707b
shell-menu = Menu
# en: 768e0c1c69573fb588f61f1308a015c11468e05f
common-title = Titolo
# A new document of the app, and one not yet named; { $noun } is the app's noun: "New presentation".
# en: ef9b1a33245907a9a1d7b7c22053168ed660d014
common-new-noun = Crea { $noun }
# en: bd2ce96ba3cfd14a4c62847d4e6bb0b8a3c72d25
common-untitled-noun = { $noun } senza titolo
# en: a479c9c34e878d07b4d67a73a48f432ad7dc53c8
shell-download = Scarica
# en: 33ce417454bfd838897deaeee2355e818a5d4160
shell-loading = Caricamento…
# en: 22456f903bcbdedb06221ade9b87febb47722e40
shell-this-link-holds-something-that = Questo link non si può leggere. Forse è stato tagliato quando è stato copiato.
# en: 7dfd19fef00f41e899fb6e2753b71ae40ba59e6d
shell-n-of-max-link-characters = Restano { $n } caratteri su { $max } per il link
# en: 51a6857d24b72bee0d1e541448d0f9c8fd5b8697
shell-n-characters-over-link-limit = { $n ->
        [one] { $n } carattere oltre il limite del link
        [many] { $n } di caratteri oltre il limite del link
       *[other] { $n } caratteri oltre il limite del link
    }
# en: 1cfbe154225ecb3a01f463f1adde07279f1a454a
shell-n-characters-over-link-limit-short-link-holds-max = { $n } caratteri oltre il limite del link; un link breve ne contiene { $max }
# en: e7722b7943884e579644a3f5bd2b605afd08a156
shell-n-characters-over-what-short = { $n } caratteri oltre quanto contiene un link breve
# Before a document that lives nowhere but its link (Private, changed) is left for another place: the question and its three answers.
# en: f0bba930d38a38cacb48e472c8d4856caa4d8fa8
shell-this-document-lives-in-its = Questo documento non è salvato
# en: 43454bfced276b8a1b83dea8a0bef1794a9bde60
shell-nothing-is-saved-on-this = Esiste solo nel suo link. Copia il link per tenerlo, oppure salvalo in questo browser. Anche Indietro ti riporta qui.
# en: e0ef0b02c240e569b52e799771dbb4fb07b35818
shell-copy-link-and-go = Copia il link ed esci
# en: fdb4eeef33355eb9aed9f11d6ddcdfe0c08a29ea
shell-turn-on-save-in-browser = Salva nel browser ed esci
# en: 634bae7c8177155bc24961f3493f425b66e88c16
shell-go-without = Esci senza salvare
# en: ee7a39c93b7018b92bcff5511a92081df68dd3db
shell-save-in-browser-is-on = Salva nel browser è attivo. I documenti che apri vengono salvati qui. Disattivalo nel menu.
# en: 97c669558589e3b0cf0917cb9caece8844ba65d9
shell-another-version = Un’altra versione salvata
# en: 87222e82bf5d208052c68fa66c93d131fa18fc67
shell-kept-on-this-device = Salvato su questo dispositivo
# en: 266695479a949eec44dea9db4e15fba00163f04e
shell-keyboard-shortcuts = Scorciatoie da tastiera
# en: bc447a3151935ceff76e781c90fb02c45d25f004
shell-nothing-to-keep-yet = Ancora niente da salvare
# en: 8c00f9130260156b1612126a7cf9a23bb3c553d6
shell-open-it = Aprilo
# en: ef6e207cc7cea57220ad9a73fc6040b0085bf63e
shell-save-in-browser-is-off = Salva nel browser è disattivato, quindi non viene salvato nulla. Attivalo nel menu.
# en: 3939d97295147954c5488340b1f427ebbfa51e69
shell-skip-to-apps = Vai alle app
# en: 286b3810e407b3cef40b582c8ca4b373a58445bf
shell-skip-to-document = Vai al documento
# en: 03d9aea1885137ab8ab4d9c24250515cb44161f0
shell-this-device-keeps-another-version = Su questo dispositivo è salvata un’altra versione di “{ $title }” ({ $when }).
# en: 25c53c58cba7054a3a2ae9e9b575c7888716ae94
shell-this-link-was-made-by = Questo link richiede una versione più recente. Ricarica la pagina.

## the home page

# en: 276c9361fff15e60f48af4d733ec83315d2bb251
home-blank = Vuoto
# en: f25b700ed9f092123a43acb205a6869342cf9dd6
common-templates = Modelli
# The button under an app's tile, naming the template list: "Start Text from"
# The list of an app's documents kept on this device, under its tile: "Write documents"
# en: c647789831582ba7f4b6aad72ea6f425b98aad6f
home-app-documents = { $app }: documenti
# en: f6fdbe48dc54dd86f63097a03bd24094dedd713a
common-forget = Elimina
# The button that forgets one kept document: "Forget Launch notes"
# en: bbc98cac8e5e1a213d5aa04b3618196a6d28bf49
home-forget-title = Elimina { $title }
# Under an app's documents, the rest folded away: "3 more"
# en: 84ab0eecfadb6332ee8b1ee5c67852b7df54e66f
home-n-more = Altri { $n }
# en: 7f2352058be05faa9a191d7ac6eb2cf0a15b228f
home-aboard-project-made-with-respect = Un progetto { $aboard }. Fatto con rispetto a New York.
# en: a26ce4e876668bb8cdbd6db05cc668d436b73ba6
home-beta-version = Versione beta
# same
# en: 84add5b2952787581cb9a8851eef63d1ec75d22b
home-email = Email
# en: 5b5d9a510b8eb3d8ca42591036a5fb8c0402a674
home-templates-for-app = Modelli per { $app }
# en: 5c88e1ec022720d6a2199c408f861dd61bfdbb08
home-app-templates = Modelli per { $app }
# en: 5ea1c79be74b3d7c077d35212d473ca6fbd80c4a
home-templates-for-app-name = Modelli per { $app }: { $name }
# en: 9b96d854dd8e79adb3ee6e1e0e419b50fc1aed43
home-templates-are-not-saved-in = I modelli non sono ancora salvati in questo browser. Connettiti a Internet per vederli.
# en: 25d37d0580af5bc389b9332f3640f6d73ef93e48
home-documents-found = Documenti trovati
# en: 5e46670f6fe68987a7e5c94f03e192aff635df77
home-no-document-here-has-those = Nessun documento corrisponde
# en: 1dfc2a61eb2345a48a2a91b7922b83f580553732
home-search-your-documents = Cerca nei tuoi documenti
# en: 4f5fbd7fb6a16b16ebe3c347bf43c9a2455a1560
home-n-documents-found = { $n ->
        [one] Un documento trovato
        [many] { $n } di documenti trovati
       *[other] { $n } documenti trovati
    }

## the drawer (hamburger menu)

# en: d9a36850b7f3f78365a998cb16cb68b6fd79400d
drawer-apps = App
# en: bbfa773e5a63a5ea58c9b6207e608ca0120e592a
common-close = Chiudi
# en: d6cbbf296e77dd589e704c39eb4d6575d31a1d22
drawer-default-name = Predefinita: { $name }
# en: 1660227e6037ceaaaacebea7ba86a1f92071bd39
drawer-save-in-browser = Salva nel browser
# en: dd8082be77e9211f033a55131c1a6360f12b0e1d
drawer-what-is-this = Che cos’è?
# en: fa7684f5e02290b9144d9d981add78ff873eb052
drawer-turn-on-to-save-files = Attiva per salvare i file nel tuo browser.
# en: af191ab94c0b2f93d5e90820805b9c7f419ce80d
drawer-turn-off-to-remove-all = Disattiva per rimuovere tutti i file e le impostazioni.
# en: db5f691e51583d80782a9c51e78f01c49ccefd02
common-nothing-saved-in-this-browser = Niente salvato in questo browser
# en: 15f47f2fab9454be9fab70ba4bd89293fdc40c0a
common-saving-in-this-browser = Salvataggio in questo browser
# en: 5e543c55dd0832d9cbbdccc9e22011d240080e50
drawer-remove-all-files-and-settings = Rimuovere tutti i file e le impostazioni da questo browser?
# en: 89b86ab0e66f527166d98df92ddbcf5416ed58f6
drawer-language = Lingua
# en: a797e30923ac1be590300ce6b08e63b4e6dc6688
common-theme = Tema
# en: 15360c25a66578ad69e81e4c2fc3f0001e8a2258
drawer-match-device = Come il dispositivo
# en: a36ef8aba22905e2d2efbf1ac1d6230d5761859d
drawer-light = Chiaro
# en: ae1ef01432946b8976b9b58575b3390ab7644db2
drawer-dark = Scuro
# en: 6b21fb791ac05170893860c248401cd24a59b732
drawer-about = Info
# en: 515e0d24040d094379cfdc94e3c6c2f63a26f1f6
common-tiny-little-office = Ufficio Piccolo Piccolo
# en: 399d4aacd52f76ac8090ce08a31e550e2123645d
drawer-about-tiny-little-office = Informazioni su Ufficio Piccolo Piccolo
# en: 6218d1c0ab69084ed45fb0f022b95f382310184a
drawer-tiny-little-office-is-experiment = Ufficio Piccolo Piccolo è un esperimento di { $aboard }, uno studio di New York di strategia digitale, IA e sviluppo software.
# en: 04a1291dcc6e5d304f04516685710a331963f630
drawer-to-reach-out-with-questions = Per qualsiasi domanda, { $email }.
# en: 522edc71559293b5713cff3f13c2dbafd37a56a3
drawer-email-us = scrivici
# en: 98187f1688112fa57c00a326f526288fa3e6b023
drawer-if-you-find-bugs-please = Se trovi dei bug, per favore segnalali nel nostro { $github }.
# en: c6651994b242228b647fbbd2a83eccefd957abca
drawer-github-repository = repository GitHub
# en: 0fe421942f09b119f9019d2de286f5a43eefd4f3
drawer-all-of-these-notes-these = Tutti questi appunti, questi disegni e queste frasi scritte col pennarello sbiadiscono col tempo. Solo l’effimero dura.
# same
# en: 45efc495ed63ce777a86a3f8a9f4475269fb7542
drawer-eugene-ionesco-book = Eugène Ionesco, { $book }
# en: be1c21d6fe0ae49ef2cea2d317a4967da26d015c
drawer-discoveries = Scoperte
# en: 687c82861c956e47456186f6522cfc8dbadb8ef6
drawer-documents = Documenti
# en: a5c79e56eede8d4e922d461872629a01dd41ab77
drawer-find-app-template-or-command = Cerca app, modello o comando
# en: 45e5f3f72e961cb70134ba35f7a27a9620e515f7
drawer-commands = Comandi
# en: b993b0c537190bfc94b21360ac5abe51e56be36f
drawer-nothing-by-that-name = Nessun risultato
# en: 85773bc941e47b21f6cc345b225265e3144489be
drawer-add-to-home-screen = Aggiungi alla schermata Home
# same
# en: 9b3cbed5c490c07473546a88768ba29b787e9e52
drawer-size-of-everything = Zoom
# en: 943c5ac9fa7766d7c1ebecbc95c4e0d27b4ef9d4
drawer-to-add-tiny-little-office = Per aggiungere Ufficio Piccolo Piccolo alla schermata Home: Condividi, poi Aggiungi alla schermata Home.

## links that leave the site (kit/ui/link-guard.ts)

# The menu button's tooltip: the Office mark is the menu.
# en: 4a48e81d0d023913c2155eb30954f58853a5591d
leave-tiny-little-office-menu = Menu di Ufficio Piccolo Piccolo
# The question before a link that leaves the site: "You are leaving Tiny Little Office for" over the site's name, large.
# en: 92ad7c004fe14dea34666631ff31b016eb39ee40
leave-do-you-trust-this-link = Ti fidi di questo link?
# en: 8d85feca3f164857fc84014a8f2ed5cc4846d4c9
leave-you-are-leaving-tiny-little = Stai lasciando Ufficio Piccolo Piccolo per
# en: 50ef68d5c205237951dae42aa775a66480171c46
leave-this-link-writes-email-to = Questo link apre un’email a
# en: 102dce223fdc2f3bbdda71f28108e2a6fdf21710
leave-this-link-calls = Questo link chiama
# en: afb8b3199e929e5e9f886fdf382599c9d440c71f
leave-not-secure-address-what-you = Non è un indirizzo sicuro (HTTPS). Qualsiasi cosa invii potrebbe essere letta lungo il percorso.
# en: 003e4888e77a22c782047c7d26d028c5eca46f1c
leave-whole-address = L’indirizzo completo:
# en: fdb31cf3fb383190c6864d4effd5fd6041b330cb
leave-someone-wrote-this-link-into = Questo link l’ha aggiunto chi ha scritto il documento. Il testo di un link può essere diverso dal suo indirizzo. Continua solo se ti fidi.
# en: 2e0b45f2a456e8db55f08d7b65e87593a3e9a140
leave-go = Vai
# en: c0f31f8a18b087fc577cbc50e9d37c68cb16c9ae
leave-links-of-this-kind-do = Questo tipo di link non si può aprire qui.
# About's last line, a link to the source of the build the site runs: "Running commit abc1234".
# en: 0eda2175601e6a4148c1c8b3f85c330bc7fbcabf
leave-running-commit-commit = Versione in uso { $commit }
# en: 45469d1ce86c199fb2984929d6c2e408178f7032
leave-this-link-hides-characters-in = L’indirizzo di questo link contiene caratteri nascosti.

## the copy kept on the device (status lines under the switch)

## sharing: the Share dialog (kit/core/shell.ts), where the link fits (kit/share/limits.ts), the arrival banner

# en: 21697833514286cb120912c109ed55e870e44b01
share-copy-opened-in-new-tab = Una copia aperta in una nuova scheda
# en: ae7b279c96200b853008a352fa110ac2565f3dc5
share-edit-link = Link di modifica
# en: 12355fc4c6eeb80306a7fe5199240b694bf2b85e
share-present-link = Link di presentazione
# en: bba41b4c62a01956942830c32fc1498945c30fcd
share-copy-into-new-document = Copia in un nuovo documento
# en: 2f84eea5d45da4f1ce1760b85db18a854f4e1b39
share-copy-link = Copia il link
# en: 6e9d1ebfe7124caf277155d2f57b5a6787f30198
share-copy-of-title = Copia di { $title }
# en: 367f9cb75618d64b28286bdc4a5b8a3f4d7092f0
share-encrypted-here-service-holds-only = Cifrato nel tuo browser. Il nostro server conserva solo il link cifrato e lo elimina quando scade.
# en: db4fb5a00a9a2172e9d45a362ff1b772884f64b5
share-expires-in-n-days-date = Scade tra { $n ->
        [one] { $n } giorno
        [many] { $n } di giorni
       *[other] { $n } giorni
    } ({ $date })
# en: ae9d408cb75f0f6745c4a64cb802e6442cc299f4
share-expires-in-n-hours-date = Scade tra { $n ->
        [one] { $n } ora
        [many] { $n } di ore
       *[other] { $n } ore
    } ({ $date })
# en: a202af448924971f4ffb4dc06ed405775781207e
share-expires-in-n-minutes-date = Scade tra { $n ->
        [one] { $n } minuto
        [many] { $n } di minuti
       *[other] { $n } minuti
    } ({ $date })
# en: 0ef0475467d903f5adb0297bbc7979b7b0792d0c
share-opens-as-pages-to-read = Si apre come pagine da leggere
# en: 8744400a02796b44742f8f5e5b66216821eab90d
share-opens-in-editor = Si apre nell’editor
# en: 7fbbb75c4e853ef0e42da5fe316344fdf1a6143c
common-whoever-opens-this-link-gets = Chi apre questo link riceve una copia tutta sua. Le sue modifiche non compariranno nella tua. Chiedigli di rimandarti il suo link.
# en: 94b01acececc033463cc7731d659fbcae11c2b47
share-short-link-that-expires = Link breve che scade
# en: fed3d23d480dd0bfe5a0cfff4d9f3dae7857fbe6
share-this-link-expires-in-n = Questo link scade tra { $n ->
        [one] { $n } giorno
        [many] { $n } di giorni
       *[other] { $n } giorni
    }
# en: 5f55ae03e19eebbbd3a277a7647d0b2ac27c4ec8
share-this-link-expires-in-n-hours = Questo link scade tra { $n ->
        [one] { $n } ora
        [many] { $n } di ore
       *[other] { $n } ore
    }
# en: a37642996477c73f2e3335a1e06a28d577806b52
share-this-link-expires-in-n-minutes = Questo link scade tra { $n ->
        [one] { $n } minuto
        [many] { $n } di minuti
       *[other] { $n } minuti
    }
# en: 04609a8df41f042b261ed7cf06b80c2667badd0e
share-this-link-n-characters-fits = Questo link: { $n } caratteri, sta in un SMS
# en: 822e1dca627d6149b0263bdae6477ca56c62a36c
share-this-link-n-characters-too = Questo link: { $n } caratteri, troppo lungo per { $where }
# en: f9551d11c51a8da0015b0716e3aab327784b2ec2
share-discord-message = un messaggio Discord
# en: 36dec9aa0b166bef869350675231f78529bbabd8
share-a-qr-code = un codice QR
# en: 13be5551761c07ae1735af2e3fbcea08dae3dce3
share-link-in-google-docs = un link in Google Docs
# en: 66ab040bba28a1d3d5307879564a2bf9ff2ae108
share-telegram-message = un messaggio Telegram
# en: aba5163784cd5c92d1a33174634785cace589ca8
share-a-short-link = un link breve
# en: c372595cddc6ae62ad3eb2ddfaa7cb6546e4df31
share-small-nfc-sticker = un piccolo adesivo NFC
# en: 7be07ec57c401332cca2718a0d4a6a516b77527f
share-text-message = un SMS
# en: 1efc6b2c2c837a8ce7a9054983d97158307b3c0e
share-chrome-and-edge = Chrome ed Edge
# en: 777a1e3310cf18433544371b9f5422bf0ba0ac80
share-nfc-sticker = un adesivo NFC
# en: 219dd04dbbbc2c0867d0f2c748fdc25f6aba89f2
share-some-browsers = i browser meno recenti
# en: 77437a6dfcf7562798d4a066e19fd698b357c1a8
share-n-short-links-kept-here = { $n ->
        [one] { $n } link breve conservato qui
        [many] { $n } di link brevi conservati qui
       *[other] { $n } link brevi conservati qui
    }
# en: fbdda8ea6ae4f71eb78a8bd78fa2746784806ffe
share-display-link = Link di lettura
# en: 54c374d4a68f528c4c4022d195a62e22b4bf57bb
share-opens = Si apre
# en: c2e98476efb5e35f50dae898c1b56d7085eee7da
share-link-copied = Link copiato
# en: 4dfbe46077fcd9769d6688a682515a0cf12a7d80
share-could-not-copy = Copia non riuscita
# en: 24897bc1ceb803cb3796e491bc10a252f16a950f
common-share = Condividi…
# en: abba02fcdd8b9ce1dde7f39b5b6aa0bd741f0d57
common-qr-code = Codice QR
# en: 7f8c79bef572d079a2e70de568104a605b4050cf
common-qr-code-of-this-document = Codice QR del documento
# en: 5987984bd3953aa88448226f480b1c67ad98ab52
share-this-document-is-n-bytes = Questo documento è di { $n } byte; il codice QR più grande ne contiene { $max }. Accorcialo di { $over } byte e ci starà.
# en: 716ebea121ec7b8a4dd9ea47314131122cf0aab1
share-this-document-is-n-characters = Questo documento è di { $n } caratteri; un link breve ne contiene { $max }. Accorcialo di { $over } e ci starà.
# en: ae5014875f1eec5203f8744323723d2ee679d1cc
share-expires-after = Scade dopo
# en: 1e1c72c2e33894ad38b820f1d4ed17ef478067be
share-hour = Un’ora
# en: 4286c1f81faa848587ed38925e9b181e939f4998
share-day = Un giorno
# en: 51e2a8b00255a6db1c49b306e7ac28f2e6ac9a23
share-week = Una settimana
# en: 6d17c3840dec7c16f42f223c4a5472efbbff08c1
share-month = Un mese
# en: 38c22f9dbdb41d2131b4324b7722c45a1f543420
share-make-short-link = Crea un link breve
# en: 94d7d8ee473f817fa4b57737e7a01ec3cd13d4d4
share-making = Creazione…
# en: 1c6c031b40782efe6b28678fc42d5569cc11e029
share-hundred-links-day-from-one = Limite raggiunto: 100 link brevi al giorno per indirizzo. Riprova domani.
# en: 0b5140c5b10a2b84301b5ef43056b7d89bd2187c
share-short-link-cannot-be-changed = Un link breve non si può modificare né eliminare. Scade automaticamente.
# en: 4d9182a72e391841c2817e9943cf2b07adf70220
share-could-not-shorten-link = Non è stato possibile accorciare il link.
# en: 4c0067d6b6bd96cdab1ae363ce342312a93834fd
share-this-document-is-too-long = Questo documento è troppo lungo per un link breve.
# en: a4d0b704a911979249dd2629e81a0205fab0aa44
share-up-to-hundred-links-day = Fino a 100 link brevi al giorno per indirizzo.
# en: e963907dac5cd5c017869b4c96c18021c9bd058b
share-remove = Rimuovi
# same
# en: d0517071aa376e797705058bbad4b658954b9930
common-link = Link
# en: b15dbf0da72e08fcfcf35d2aed0a937335b9cc5e
common-short-link = Link breve
# en: 9095e39b9975250b05476c852d1631a6651924d9
share-new-noun-date-n = { $noun } { $date } #{ $n }
# Files, compare, posting and embedding: the agent and sharing surface.
# en: 1c2edb3104c7f2adce9ad2a77f3622d1beb0059a
share-mastodon-server-like-mastodon-social = Un server Mastodon, come mastodon.social
# en: 64fbd995d3b6b156ee26ae3c03e6516434c34c12
share-change = Cambia
# en: 2a07ce9a22d8e5dc1031e531518f04e50855319f
share-copy-embed-code = Copia codice da incorporare
# en: c3e1c83e5b4172d3c738e37cb69b76d93ce49b8b
share-copy-show-link = Copia il link di presentazione
# en: ad02e14e2841dfbd22ab2caa12b5541c5b01a53a
share-embed = Incorpora
# en: 4eeede7134d362f371fd18b2d63d3199bb24f01a
share-embed-code-copied = Codice da incorporare copiato
# en: 682cbb0f328f16ee213c6b44d7012512b55506b7
share-opens-deck-already-presenting = Apre la presentazione già in corso.
# en: 7858ac3ff63354f37161bd349efe11edd13b89cb
share-post = Pubblica
# en: c68fca11627c0ac342583c1782892518730cc40b
share-post-link = Pubblica il link
# en: 82584c3ce64f57a310db6846c65628266a88c44d
share-show-preview-of-first-page = Mostra un’anteprima della prima pagina
# en: ac1624e1fa626a4ba8b8ee419f0cf118d53fa480
share-picture-of-first-page-and = Un’immagine della prima pagina e il titolo restano leggibili sul nostro server per un mese, perché il social network possa recuperarli. Il documento in sé no.
# en: 6a46f4b4b3f001e64ef9652412aa1ddbdeabc489
share-shared-without-preview-reason = Condiviso senza anteprima: { $reason }
# en: 4def5924266f682e91bcdff1e5ba510a20a36902
share-making-preview = Creazione dell’anteprima…
# en: b0e8d8d6d97acaeed4ad09f7b25699817638ae6b
share-page-could-not-be-drawn = non è stato possibile disegnare la pagina
# en: b3dcb32d0d95afbd62938ff614915e68ba996861
share-picture-is-over-400-kb = l’immagine supera i 400 KB
# en: 398d796772eebe6fc3207881d76d2cf9f155da3f
share-server-could-not-be-reached = il server non è raggiungibile
# en: 686fd096a5f35bcfbcdcc5130d1be03e593d7bfa
share-hundred-previews-day-from-one = limite di cento anteprime al giorno per indirizzo
# en: 959db3cd3ff1a424890a809f9cf7445f37db3289
share-server-refused-picture = il server ha rifiutato l’immagine
# en: af490175b729a82a4315134642a89f1f87681967
share-pages-in-frame-on-another = Le pagine, in una cornice su un altro sito, con un link per aprirle qui.
# en: 9377de06278eacbdf4a297a82b8eb9aa3d4220c0
share-your-mastodon-server = Il tuo server Mastodon
# en: fccb3597262f866e1c1f6a9f20bdd2439a0370b8
share-this-link-n-characters-n-bytes = Questo link: { $n ->
        [one] { $n } carattere
        [many] { $n } di caratteri
       *[other] { $n } caratteri
    }, { $bytes ->
        [one] { $bytes } byte
        [many] { $bytes } di byte
       *[other] { $bytes } byte
    }
# en: 525f61b6729229b1a8854a9e50bcaa52ea96b131
share-where = Dove
# en: 55f653107f261dcc84be0568f5812694250f2e96
share-max-link-sizes = Dimensioni massime del link
# en: 24d948e4bdbe5b8224bbc0dfbab1923fab00b98e
share-limit = Limite
# en: f9f775ef8d81d0adcdb54a1de51a58a5ab9d24f6
share-fits = Ci sta?
# en: 0e1a1a74c78e1f4b6e8efcb92b18aea677212d76
share-n-characters = { $n ->
        [one] { $n } carattere
        [many] { $n } di caratteri
       *[other] { $n } caratteri
    }
# en: 1991ca167949231900aa143e63134d2584d8de83
share-n-bytes = { $n ->
        [one] { $n } byte
        [many] { $n } di byte
       *[other] { $n } byte
    }
# en: 36f6b0318377bb84249e4845275fa2c4e63ebb37
share-no-published-limit = Nessuno dichiarato
# en: 5397e0583f14f6c88de06b1ef28f460a1fb5b0ae
share-yes = Sì
# en: f37d6e1b1ff2eeb01d7bee0aadef337300b9db53
share-yes-n-left = Sì, ne restano { $n }
# en: 63dfcadd40126551301f363efd454c7d2c610b94
share-no-n-over = No, { $n } in più
# en: d2857acb2857d3f0021e0ffbcfc8730c9a6e2548
share-yes-counts-as-n-of-max = Sì, conta come { $n } su { $max }

## privacy (kit/share/privacy.ts, kit/ui/privacy-dialog.ts): the password, what the device holds

# The Share dialog's head line: "Created 9 Oct 2026, 14:03 · by Paul".
# en: 07fd5d289286fa4714b3f407db7875fac90b9952
privacy-anyone-with-link-will-need = Chiunque abbia il link avrà bisogno della password per aprirlo. Non si può reimpostare. Se la perdi, il documento è perso.
# en: 8c684290ce0b8a8e6cee79a145e17554064a4760
privacy-change-password = Cambia password
# en: 5be0d11b94b1ba25b2579314f6af69649a900cde
privacy-created-date = Creato il { $date }
# en: 39e64aebf907392389952dded5e20ab4836d876a
privacy-enter-password-to-open-this = Inserisci la password per aprire questo documento.
# en: 554393a215e479d023a30091a1394f7ca57690e1
privacy-forget-everything = Elimina tutto
# en: 715727cdd46f1bd0703c9e846fcdd4f369ef8313
privacy-preview-sent-with-link-to = Un’anteprima inviata con un link a un social network è un’immagine della prima pagina, il titolo e le prime parole, leggibili sul nostro server per un mese. Il documento in sé non ci arriva mai.
# en: a584ece11551d9b1a79856743236c51aba50c44f
privacy-forget-everything-this-site-keeps = Eliminare tutto ciò che è salvato in questo browser e smettere di salvare? I tuoi documenti continuano a esistere nei loro link.
# en: a798882f1c31099bb9500e2da62c0874d8dbed78
privacy-locked = Bloccato
# en: a543040c9fee74b4b34282797abbf59e9d2c99b7
common-locked-document = Documento bloccato
# en: d850ee188c7c55b64bc3624534de5c5051a57dc6
privacy-new-password = Nuova password
# en: 1851836868be57a15ca3684a090210f53c7a98f8
privacy-no-password = Nessuna password
# en: 6eef6648406c333a4035cd5e60d0bf2ecf2606d7
privacy-none = Nessuna
# en: b1b8530bbd687503cb5486e906942912fb68c231
privacy-opening = Apertura…
# same
# en: 8be3c943b1609fffbfc51aad666d0a04adf83c9d
common-password = Password
# en: 114bea5817640fe6b9eeec86b939ec0e9a7b6d76
privacy-password-removed = Password rimossa
# en: ad1909e464528c140bf96a21ce9adda2464956c0
privacy-password-set-link-holds-only = Password impostata. Il link ora è cifrato.
# same
# en: dce69146962b392ae2b157aec604eface36e90c0
privacy-password-ellipsis = Password…
# en: 9dfd349ebee555eb8d652be20dad971cae439eca
privacy-preferences = Preferenze
# same
# en: cf01481f626d5127ec7732fcbdb29504f08abefd
privacy-privacy = Privacy
# en: cefceeebf3cd6d02ddc7aca8c769881a5341e829
privacy-nothing-saved-in-this-browser = In questo browser non è salvato nulla. Gli elementi elencati durano solo per questa visita.
# en: 626a605da9dbcd888eadcad13deebd3a64011c0a
privacy-protected-by-password = Protetto da una password
# en: acef17d00b9a1b6e1e15e76d27ae53635928a7a6
privacy-remove-password = Rimuovi password
# en: 788f55b0957b15918c6aba279f4f0377a5a1db90
privacy-sealing = Cifratura…
# en: 94408e41c12e924b82da7ea6e79e5cb69ac9e042
privacy-set-password = Imposta password
# en: f897cb67f049674308a073079bd85ad0649f8c82
privacy-short-links = Link brevi
# en: c706d94b54ef0b520420dd58063cfc78bc88c7e3
privacy-set-password-in-share = Imposta una password, in Condividi
# en: e546afa59de2ec4b23ca6c4fafbaddac7bab9240
privacy-short-links-made-here-until = I link brevi creati qui, finché non scadono.
# en: b556bf027f9123d39581babef7e15564c24866da
privacy-their-names-and-links-for = Nomi e link, mostrati nella pagina iniziale.
# en: 5300fdca86b5b32fd463f73704e318a2b8fa9961
privacy-theme-lifetime-of-short-links = Tema e impostazioni dei link brevi.
# en: 0c6a2cfe53459957b6899930a2e5cd46b6541cec
privacy-this-document-has-password-link = Questo documento ha una password. Il link, e ogni link breve ricavato da esso, è cifrato.
# en: 0d21e52aba49ee4331213463b46c2ece33ad3cf4
common-this-document-is-locked = Questo documento è bloccato
# en: 1dc606b1828a1e2f5bbbed9ed30fa3a80712e3d8
privacy-this-document-is-locked-with = Questo documento è bloccato da una password.
# en: 1526a17ee7570e6235eb76a6fef8ce4b6d9a3486
privacy-unlock = Sblocca
# en: 887b0828ec99930408eb32249f1209057b1b234c
common-unlock-ellipsis = Sblocca…
# en: ce3661a255464b1b22e6f395685d0e6f9fa077da
privacy-what-this-device-holds = Salvato su questo dispositivo
# en: 8485be9e7b3e998c5f1eef5ce87d2aa67726e3cb
privacy-your-documents = I tuoi documenti
# en: d21905a9907932f7976e1ca96129c0af871f2715
privacy-your-browsers-history = La cronologia del tuo browser
# en: cdff70e571d4ed7aeb1a43cedaf33299bdcd258e
privacy-every-document-opened-here-in = Ogni documento che apri, per intero, a meno che non abbia una password.
# en: 18b8a03ed6567555edd5005aab5b090984f4b5bd
privacy-not-ours-to-clear = Non possiamo cancellarlo
# en: 3ca2d1d26637d42b974b313bb8ce231333179a9e
privacy-by-name = di { $name }
# en: a9e72cf83916d4381012a19b329292818f845a43
common-n-documents = { $n ->
        [one] { $n } documento
        [many] { $n } di documenti
       *[other] { $n } documenti
    }
# en: 1a8f1553a9832c92927784f88f31a89cd991e803
privacy-n-links = { $n ->
        [one] { $n } link
        [many] { $n } di link
       *[other] { $n } link
    }
# en: 2ddd4097832d991c46023732a889beeb8ec4c29d
privacy-n-set = { $n } impostati
# en: a97ce1edde4ad396d1cff34063087d0bf5d0e1a8
privacy-copy-this-and-send-it = Copia questa password e inviala separatamente dal link. Non verrà più mostrata.
# en: 7640428ae16fc2b673d689ddf6b1ea15eed407d3
privacy-make-another = Creane un’altra
# en: 9a0081f0b2bff82fac1961a403734134b9a3b170
privacy-password-copied = Password copiata

## a document locked with a password, placed inside another (kit/share/locked.ts, kit/ui/locked-doc.ts)

# The card drawn where it sits; { $app } is the app's name: "A Spreadsheet document, locked with a password".
# en: db4307e70c2d2722c2af2f79643b28e73325e9be
common-with-password = Bloccato da una password
# en: fa27fac915c0c87aec9006392ae6422f59857f5d
locked-app-document-locked-with-password = Un documento { $app }, bloccato da una password
# en: 49db1d83c8636baba474ad11626b5a7c5260976f
locked-with-password-unlock = Bloccato da una password. Sblocca…
# en: 507e778ae244911abcb05b73967febd0edb425a5
locked-document-locked-with-password = Un documento bloccato da una password
# What one of them is called in running text, as an app's noun is.
# en: 78ed9fb58f4437d5d29cf78ba699a560017abe47
locked-document = documento bloccato
# A placed document whose link cannot be read (cut short when it was copied).
# en: 0c45986cb6755e463398a592a861baaf44018954
locked-this-document-cannot-be-read = Questo documento non si può leggere.
# en: a2a127edeb3eed5dc264fc299b034db6493e1636
locked-that-password-does-not-open = Quella password non apre questo link. Se sei sicuro che sia giusta, forse il link è stato tagliato quando è stato copiato. Chiedilo di nuovo, o chiedi un link breve.

## words several apps share

# A menu of what can be done to the document as a whole (the Presentation Builder's submenu).
# en: 6e16ec256749730ccec984c8efeb7804db5b9737
common-this-document = Questo documento
# { $task } is the task's words.
# en: 15f18f71eefc9fedc6fedd434c2edc6a919bf130
common-done-task = Fatto: { $task }
# en: 00c65041972e0368c2c8b452d60c0a0754fcc9bd
common-drag-to-move-tap-to = Trascina per spostare, tocca per selezionare
# en: 525df57dc3610e74377113b92951476bb9387e4d
common-move-left = Sposta a sinistra
# en: 3a43e56f34dece6eb3d79dee1eff7b2f87db6040
common-move-right = Sposta a destra
# The group heading the Calendar and the Trip Planner sit under on the home page.
# en: ae2f98a099fe5855c31126233e9c13641ee7fdba
common-plan = Pianificazione
# en: 9985434cd07212b8dac01f8e015a1fa8adac9a99
common-chosen-tasks = Attività selezionate
# A link that opens the document (kit/ui/compare.ts).
# en: cf9b77061f7b3126b49d50a6fa68f7ca8c26b7a3
common-open = Apri
# en: 7bb0ddf9221c03b806b03c209e8366000124aa15
common-task = Attività
# en: 090ec5f560fc50377fcd95e5cda128e91b276e98
common-tasks = Attività
# en: 1835508670fb85faefa88cd88d4f57d3cdb00716
common-find-app-doc-template-or = Cerca app, documento, modello o comando
# en: 0d47323c5ee8dde30a5ca28f6ed6103d42081b97
common-in-this-document = Cerca in questo documento
# en: 733a5f2fb910bb704c7993cae3d8224558d405de
common-indent-or-bring-out-in = Aumenta o riduci il rientro di una voce di elenco; cella successiva in una tabella
# en: bf6e36633c2362cb7fa31a0e8f833388a49ba28c
common-move-selected-items-up-or = Sposta in su o in giù le voci selezionate
# en: 989fe994e413c509c03d3dd229b775a3ddc4707b
common-nudge-shapes-in-hand = Sposta di poco le forme selezionate
# en: b11d72438f1b00b65769e9b8597829583dc4d631
common-select-all-words-of-box = Seleziona tutto (prima questo campo, poi l’intero documento)
# en: be76d0b25853b431767ca5b5d57ef569bbc6ff2a
common-back-to-words = Torna al testo
# en: 0c0b01d469faff60dc3b2d1c035ee0a7caa03852
common-extend-selection = Estendi la selezione
# en: 11a8a25332234992a14424d8aad6fb9ce3d3b287
common-next-or-one-before = Successivo o precedente
# en: b4365b2ed2016713788d08335e5157985010ac28
common-step-out-close-collapse-let = Chiudi o deseleziona
# en: fb2997642419cda8393061543f140d40a9323957
common-check-or-uncheck-task = Spunta o togli la spunta a un’attività
# en: 0a4adf12f01d48ecdb89f5eddf5f19fd89d94522
common-too-long-for-qr-code = Troppo lungo per un codice QR: accorcia il documento, o condividi un link breve.
# en: 1e14a1c5e931f6ef8ce8378377366f3c68cef56c
common-n-of-count = { $n } di { $count }

## downloads

# en: 5b221e9c2a451799d8f37e2b9874409d5e03ab05
download-print = Stampa
# en: f304fc6dd3e87a37a6c53cb62344c10a789a7ad9
common-print-or-save-as-pdf = Stampa, o salva come PDF
# en: 473b3126e859286ef98d231328fa11a3216823a1
download-picture-png = Immagine (PNG)
# en: 3ad1b6c4e3dcf07e9ac0c95d5303f7ca4f89e55e
common-web-page-html = Pagina web (HTML)
# en: 1ba61ab4dec3fa0358c9ed0c77d6ac46f598a1f2
download-text-tlo = Testo (TLO)
# en: 840a0fda84379bffc2a266a92bbb990672a7c8d2
download-data-json = Dati (JSON)
# en: f77017c03d9d2be93a74ef7ef7e099dd77976f01
download-downloaded-name = Scaricato: { $name }
# en: 01125e1be1f56cdaa47c6314a158e1219af819b3
download-failed = Download non riuscito
# en: e7f6a6728b280414756d238ae70084720018ba47
common-open-in-tiny-little-office = Apri in Ufficio Piccolo Piccolo
# Under a document cut off at a slide's foot: a link that opens it whole, in its own app.
# en: c510d6c04c0951500c8e43f623e9f8886c378aec
download-see-more = Vedi altro

## the bar, shared by every app

# en: 95802daab3a23990338179f72248350c1434cf39
common-insert = Inserisci
# en: 19e07430eed6d97d6d73cb4a2967b1f316520f54
bar-bold = Grassetto
# en: 1616e2e5405e69c4e3914c67c644a9bd3ac00956
bar-italic = Corsivo
# en: 39773aa3efa19090c918baedac1fe737dea25b92
bar-underline = Sottolineato
# en: a93b9a6808a95ca93515164188159659017155cb
bar-strikethrough = Barrato
# en: e1da9275bc5b420601738531d5e4445b44e0e6e9
bar-highlight = Evidenzia
# en: a3089b7fae27bca3309070e0487079a25b8f1ede
bar-heading = Titolo
# en: dd870cfcae5fa76d524491679a57b27d41ffb462
bar-bulleted-list = Elenco puntato
# en: 8294ea4f78d097513144a9b8ba4e6d545a2a19e1
bar-numbered-list = Elenco numerato
# en: 0424f6e7026fa4bc2c4a7043083417315113c79b
common-table = Tabella
# en: 40e31a210a1913fd0a8b28b892780996d154c70d
bar-footnote = Nota
# en: eb9a4bc1c0c153e4e4b042a79113b815b7e3021d
common-date = Data
# en: 39fc72124884d6573e4f9f89585f071ed0782696
bar-undo = Annulla
# en: 471b94d402d16a5fe7549d001a68ada1f7ddb16f
bar-redo = Ripeti
# en: 24345a14377fd821d3932f4e82f6431640955b0b
common-today = Oggi

## the editor (<to-text>): chips, cards and the bubbles

# A footnote's mark, and its words where the notes are drawn, by its number: spoken.
# en: f91f3abb5afff1229edcc701ea915aadef98aca8
common-footnote-n = Nota { $n }
# A card standing for another document held in this one, of a kind no app here reads: "abc document".
# en: ae6aebc074024e9de875113693a49f1e19bf555f
common-app-document = Documento { $app }
# The same card when its app is known; { $noun } is the app's noun: "A spreadsheet".
# en: 3f77d60418ea2f6a04196c1e67715b3007390e77
common-noun = { $noun }
# en: adac69379a626c2436948a4ef1792c7d719ef929
editor-code = Codice
# en: 6512ee1541e9a6c52d5bf7cf465332e8df25ea3c
editor-connection = Connessione
# en: 86ccb2898e6f07a6967cf007c54e365e26ba776c
editor-n-rows = { $n ->
        [one] una riga
        [many] { $n } righe
       *[other] { $n } righe
    }
# en: 221e4b1822bb3e80534c57d63a89d0f58d85c77b
editor-notes-words = Testo della nota
# en: e9b450d14bc2363d292c84f17cfad5cfbd58a458
common-done = Fatto
# en: d70f93df5e8f9b55be44fbeee9d203972e3383d4
editor-address = Indirizzo
# en: 74d3b25667541c75d79e0558305f4bda62229bd7
editor-not-address = Non è un indirizzo
# en: c8648f259049ce8bdb49529963c37a97f75e8d4b
editor-set-link = Imposta link
# en: d2de1a2831e7fee28d6c8d214b66da0d1bed30c8
editor-open-link = Apri link
# en: f377ac75602950b2c36449de5bceb3c12333ac77
editor-change-link = Cambia link
# en: 8d48d1f9e74c4fecd89a67645ca3593ef0964710
editor-remove-link = Rimuovi link
# The selection bubble's name: what can be done to the words selected.
# en: 041a5dec481d6bf0724caeaa84bc135d7d9062d4
common-format = Formato
# en: e5fd9cfe0e8039111d54b588e77b2bb0cad41c3a
editor-done-lowercase = fatto
# en: 4ed7199b77561b7a7c013f7a8504b6686496302d
editor-not-done = da fare
# en: 984cfca8d70e0b1e37a9e70c98a219bb12a05f23
editor-bold-italic-and-links = Grassetto, corsivo e link
# en: a983f10d71bb808f58795f6ae728a6e76f08ce78
editor-one-of-words-column-holds = Una delle parole che la colonna contiene, o una nuova
# en: e31d972229de381b461860014dd710856361917a
editor-option = Opzione
# en: eb883fb88ed57f39b760fee6ee8f5a04a8cdc7ba
editor-this-browser-lets-page-paste = Questo browser permette di incollare solo da tastiera o dal menu Incolla.

## the example in the kit's own documentation

# en: a76d4605993fe042c6e171382b1fba057fa31ff7
example-n-slides = { $n ->
        [one] una diapositiva
        [many] { $n } di diapositive
       *[other] { $n } diapositive
    }

## the Word Processor

# en: e8e834c4d268a3032b26958914d01ef0addf080e
common-word-processor = Videoscrittura
# What one of its documents is called, in running text: "Untitled document"; each app's noun is in its section.
# en: 4f8278c89ad16da05fec4fdfc61fe44798b92720
write-document-lowercase = documento
# The group heading the Word Processor sits under on the home page.
# en: d26d55c7f815c82cf430c3915b3bb833d3f02e5e
common-words = Testo
# en: 703864836e29b00a7c7490f714fd2d18474de840
write-words-on-page-headings-lists = Parole su una pagina: titoli, elenchi, link e note, una tabella che fa i conti, stampata su Letter o A4.
# en: e214b8a29923056887b7edf6635d90dcbb2abe88
write-document = Documento
# en: 6e660ac1c8b81a53e302f6bb0298551ec820eceb
write-here = Scrivi qui.
# en: 6b8ad00f4398c3aa47f82637d019dad9e4f9da0c
write-subheading = Sottotitolo
# en: 05058e0b630498611ebc41894f7b1670dcd5870e
write-paragraph = Paragrafo
# en: b4d812c8bee8056808c14f1b31b6765342c8437e
common-bring-out = Riduci rientro
# en: aacf42132cce6cf5c1608a5d27f90fcbf93ae851
common-indent = Rientra
# en: c83b0ec2d98a2ca38077be2f03102aedeb0ab261
write-align = Allinea
# en: b442b455b6a5e55f249769068c3fcc4832aea89d
write-align-left = A sinistra
# en: a2391118c8141b7f016207cb0da015ce9b3323e4
write-center = Centra
# en: 9bb446b31da260be7a0206a0e15270eb6bf47255
write-align-right = A destra
# en: 536d2746f7f2f88df35515a9cd5e44cb1582b9ca
write-justify = Giustifica
# en: 2ed7f99f153a2a3dd123644137db651eb191b2b2
write-paper-paper = Carta: { $paper }
# The Look menu: each look's name, then a line about it drawn in its own type.
# en: c1ccf83eea101ddafb5de4e3dea5f3693ae473c0
write-sans = Sans serif
# en: 2fa97b3a9a6621a3a887ef5686bf4604fa6804e6
write-clean-and-plain-throughout = Pulito e semplice ovunque
# en: 56632c1841ab67cf1e7c7179b9c5ea0e32ea81c1
write-bookish-serif-throughout = Un serif da libro ovunque
# en: 7daed9b46fb34186159d19a2dca5208daf510f54
write-monospace-ragged-right = Monospazio, bandiera a destra
# en: 9ec6ab25de9a050b550600a98c5a63e5b2c00bf8
write-serif-and-sans = Serif e sans
# en: b3ca8ebc46d597ea38c5f4877cf7ae7bfb4e3d68
write-serif-headings-sans-text = Titoli serif, testo sans
# en: e0c6a397d49350373ed4d55573e9365c212631bc
write-sans-and-serif = Sans e serif
# en: d9d9d24d3963e4acfa41725ddd5a228f70b0869f
write-sans-headings-serif-text = Titoli sans, testo serif
# en: f69f233005f15802770fd26fbf7ead52ec13d9e6
write-book = Libro
# en: d242210a93b0f91c16b76df2eaf8efc7ae211585
write-justified-indented-small-caps = Giustificato, con rientro, maiuscoletto
# en: 5ebe6500747dd5dbad08cc1b33d55fac89ccbe97
write-newspaper = Giornale
# en: ed0ae2181b2137e6b9f63fdbaeed415ac7e73502
write-narrow-headline-two-columns = Un titolo stretto, due colonne
# en: 62fb6cfda0506f0ed73ad066151086d3eed2296d
write-horizontal-rule = Linea orizzontale
# Insert ▾'s rule in a document: what follows starts the next page.
# en: 830b8871f026d13b7b94d6723471f2b4e152e360
write-page-break = Interruzione di pagina
# same
# en: 9ce3bd4224c8c1780db56b4125ecf3f24bf748b7
common-ok = OK
# en: f2dc2c1e1465864ffbc4e8100c86cfeeafc4fffe
write-this-card = Questa scheda
# en: 1e06557fc0660e50a99fa6eef90bff822411e3ae
write-open-in-app = Apri in { $app }
# en: 108add9c9b3eed03ee5eb57783d780a485840218
write-locked-worked-out-for-you = Bloccato: calcolato
# en: ec0c3b76630fd745381cc215a284820af75a683a
common-footnotes = Note
# en: 5c71d5f47999af43b0a80e72abd8e5b79e736f80
write-back-to-footnote-n-in = Torna alla nota { $n } nel testo
# en: 6bc94b9eb554810d980ae7fb5673badbbb0b531c
write-back-to-text = Torna al testo
# en: be51f46400fec04e375ba1ea35d98d05b69a1a2e
write-n-words = { $n ->
        [one] una parola
        [many] { $n } parole
       *[other] { $n } parole
    }
# same
# en: 71d562b7d96e16456a25e7230f3bc08bb796552a
write-word-docx = Word (DOCX)
# same
# en: 23e67fceae0d77dd571dd25695fc0499faf1bb77
common-markdown = Markdown
# same
# en: d50fcd6f846a2616a90ec5dd1f67488a993c2743
write-rich-text-rtf = Rich Text (RTF)
# A table in the text: its heads, its handle, its column menu.
# en: f4344253d823d09db13bc3877d37c9618588506a
write-add-column-before = Aggiungi una colonna prima
# en: 9b3acfc74a5d37d699868ade0ed3d142024174cf
write-column-c-what-it-holds = Colonna { $c }: tipo, nome, aggiungi o rimuovi
# en: 1f01479a40aa348fc273d4d09636403f89eff717
write-table-move-copy-or-take = Tabella: sposta, copia o elimina
# The templates
# en: cfd76febbb671e54b2f280128fb5c317389758a7
write-a-letter = Una lettera
# en: 7456f1ce5f81c497b66302751f617f60612306f6
write-your-address-date-greeting-point = Il tuo indirizzo, la data, il saluto, il punto, la chiusura.
# en: ae3cd6584a49de52c70c1e00ae0a02c8abab166b
write-meeting-notes = Appunti di riunione
# en: 7bbe470d4a5d9510c0fcb6844b519d118681beb7
write-agenda-what-was-said-what = Ordine del giorno, cosa si è detto, cosa si è deciso, chi fa cosa.
# en: 9fb58963c66db0c8ca7c638f491e82246e226d30
write-resume = Curriculum
# en: 3f3c7baad1c18a4ab23412f60d65b5179346006d
write-name-and-contact-experience-education = Nome e contatti, esperienza, studi, competenze: un curriculum su una pagina.
# en: 5a0ba3bb83f0992ba00ae94db6a7464210c40711
write-contract = Contratto
# en: 50899f480b3395ee509689b06672ad9d8719e082
write-plain-words-agreement-what-each = Un accordo in parole semplici: cosa fa ciascuno, e come finisce.
# en: f9f38818c406d0878defb17a2356e1a2c658861a
write-invoice = Fattura
# en: 4e056cf73efd0995ce1e7c5fd88900894935896c
write-who-what-and-how-much = Chi, cosa e quanto, i conti fatti nella tabella; stampata su carta da spedire.
# en: 80c40a5c8be53118fd8a9fc487b43f20c3014fbc
write-cover-letter = Lettera di presentazione
# en: fe727759e1b85df4a1d71348a1a6dfd6ef8e135d
write-applying-for-job-position-what = Per candidarsi a un lavoro: il posto, cosa hai fatto, perché loro, in quattro brevi paragrafi.
# en: 1fd79b9555ddf59862d60aa0aa3bb74fb74aae78
write-memo = Promemoria
# en: cfa5a189ad757d015661acb500917a198d8a13e1
write-to-from-date-and-subject = A, da, data e oggetto; il cambiamento in una frase, perché, e cosa ti serve in risposta.
# en: 092f99ea11a34a8490e7a767a83a42fc45634f82
write-minutes = Verbale
# en: 34dbbbeddd62f120a000701c56adebc8bae95352
write-formal-meeting-who-came-treasurers = Una riunione formale: chi era presente, i conti del tesoriere, una mozione e il suo voto, gli impegni presi.
# en: e04a25d1f69061bfe7770b16891fca2c413bcbe0
write-one-page-cv = CV di una pagina
# en: 11628c83c5de19d1338628ed7153b648f496b27c
write-typewriter-set-cv-now-before = Un CV in stile macchina da scrivere: ora, prima, studi, lingue e strumenti.
# en: 6ed05e720ccc3ef269db1b38201da8b873acc895
write-newsletter = Notiziario
# en: e583899cf44dbc07e6d8d4e7a252d39552e4e3d4
write-block-associations-month-dates-in = Il mese di un’associazione di quartiere: le date in una tabella, benvenuti, notizie e ringraziamenti.
# en: 1dcda804c96da3cc7e73e8a1672d4379a741f11a
write-recipe = Ricetta
# en: 72490fa559ee9ce5ed498b58b3e2cad900af7155
write-what-you-need-in-table = Cosa serve, in una tabella che passa da quattro a sei porzioni, e come, passo dopo passo.
# en: aa3ddab4d749b73414ddd65201f9c6553b98a49b
write-questions-and-answers = Domande e risposte
# en: 1854b96dd11603bed03cce723369ef661a6f34f8
write-questions-people-ask-each-heading = Le domande che la gente fa, ognuna un titolo con la risposta sotto.
# en: 6d234a17fecd5048e790eb4d1c415e17899a0e56
write-press-release = Comunicato stampa
# en: ba41d12bbba317bcacf230155abba7ce9e400379
write-news-in-first-line-detail = La notizia nella prima riga, i dettagli, una citazione, gli orari, e chi chiamare.
# en: 0c30f8a886ae8207e0702b4daf5eda405b19a131
write-news-article = Articolo di giornale
# en: 66280b179ec208e759c8fd7e05a4b1171c355c9f
write-headline-byline-story-in-two = Un titolo, una firma, la storia su due colonne su carta, e un grafico dei numeri.
# en: 19ad8ec7231e0cc9d9ea7e0684742672018e1f05
write-interview = Intervista
# en: a8d0cc9ab05d2f4925e897a47c9c9554e289fb4e
write-introduction-then-questions-and-answers = Un’introduzione, poi domande e risposte, con il nome di chi parla.
# en: 94a18e60341a34b6feec02442ec2d70ee1244900
write-book-review = Recensione di un libro
# en: a8ccbb45148f664a9800e533e32902524ce8217a
write-book-stars-what-it-is = Il libro, le stelle, di cosa parla, cosa ha funzionato e cosa no.
# en: 1eb36cb79b31a29c161965efdbb310289b4e5814
write-music-review = Recensione musicale
# en: 75857043416829c78af6afbfcd886ea90847e06c
write-album-label-and-length-stars = Un album: l’etichetta e la durata, le stelle, i brani, i migliori.
# en: fae48a8f67fd81fb5d54b5a9c2d60929cd5da2f7
write-thesis = Tesi
# en: 8dd8017f140560c80229f7d051a8fb2376183e9a
write-title-page-abstract-chapters-with = Frontespizio, riassunto, capitoli con note e una tabella, e una bibliografia, impaginati come un libro.
# en: 42921f1b739a62eb82bc6f16ce47ff5ce5fd4da4
write-grant-proposal = Richiesta di finanziamento
# en: 381d823ac8ecdff832331120748c151a113b2464
write-ask-need-plan-budget-that = La richiesta, il bisogno, il piano, un bilancio che torna, e come saprai che ha funzionato.
# en: 1b731d688386e2e229d1c2b671e96c2bfce768a4
write-syllabus = Programma del corso
# en: fc9a91d648763f9cd04a596f372b833e76f709f8
write-course-when-and-where-what = Un corso: quando e dove, di cosa parla, le settimane, e voti che sommano 100%.
# en: 3c847b9cd456626c998b9d2793f7701117ee4c80
write-formal-complaint = Reclamo formale
# en: f98daa2b60c626279045f82029a9e58dfcd90f4b
write-what-happened-in-order-what = Cosa è successo, in ordine; cosa vuoi; ed entro quando, prima di andare oltre.
# en: f74c6bc075b1961f73f45729ce6281dc84fb3ccf
write-letter-to-politician = Lettera a un politico
# en: 2e754026e13e7ebe41d9513e31f94d8268341243
write-ask-your-representative-for-vote = Chiedi al tuo rappresentante di votare: chi sei, perché qui conta, e una domanda.
# en: de21096f37522d15740e7a4acd69efc811f9b5ce
write-love-letter = Lettera d’amore
# en: a6977a11c96b06575fd8359e1bb9e3dea5a21fcf
write-ordinary-things-missed-letter-across = Cose di tutti i giorni, che mancano: una lettera a distanza, in serif.
# en: 1af339528a1814a5f1dc409f2d108e0308035b87
write-wedding-speech = Discorso di nozze
# en: b040a94a7bd386ebaee15aa4c4535da004fadc4c
write-how-they-met-what-you = Come si sono conosciuti, cosa hai visto da allora, una parola per ciascuno, e il brindisi.
# en: c88c994e6c6c50db17576753df90aac55138155f
write-eulogy = Elogio funebre
# en: cdc87e623e95678f786543dd272ba279df15e8ee
write-life-in-few-minutes-where = Una vita in pochi minuti: dove è cominciata, chi era, cosa ti mancherà.
# en: 6c63ce6d4727a3fb46c16a62ac8d536b0b61fd08
write-zine-essay = Saggio per una fanzine
# en: ecce024c73aadb2150552b3419d5aa1c3cb72c17
write-personal-essay-for-small-magazine = Un saggio personale per una piccola rivista, scritto a macchina.
# en: 563a631aba8690962836c99d15886672eb96ef62
write-petition = Petizione
# en: 6d3ace089783eb6cf5e5fe47a7d74a3ee5c21f39
write-what-you-ask-why-and = Cosa chiedi, perché, e i nomi di chi è d’accordo.
# en: a6a1d25b018c9318540556e3fe374fdf8b23aff8
write-terms-of-service = Condizioni di servizio
# en: 79b220d914e24eb7ac79428e72639e8547d8ab9a
write-small-businesss-terms-in-plain = Le condizioni di una piccola impresa in parole semplici: prenotazione, prezzi, chiavi, cosa succede se, la fine.
# en: fe3b114dccf2739f949d65ac4101037eb8f92543
write-open-as-outline = Apri come scaletta
# same
# en: de69a629f9c30af3f481110f0f42a7c0c5efacfb
write-a4 = A4
# same
# en: ee14050617b7b58e17aabccd61c241ccdafc6379
write-letter = Letter
# en: c036e85b63c6818f6732a2898cf85f30f8074bfb
write-name-this-column = Dai un nome a questa colonna

## Insert's dialog (kit/ui/insert-dialogs.ts): Tiny Little Office Doc

# en: d5674bb4dcb8c5fe378eb9cd0bb9d1849ed37581
insert-tiny-little-office-link = Un link di Ufficio Piccolo Piccolo
# en: cdea71ff947c2b49dd7d7ea146fd3efeb9fa5677
insert-opening-short-link = Apertura del link breve…
# en: 9d2d34c4b04d8410e0025beb7899a31d1bc57c04
insert-paste-link-of-another-tiny = Incolla il link di un altro documento di Ufficio Piccolo Piccolo, lungo o breve: qui si vede la sua prima pagina.
# en: 7e4861cdc8de2c0c4cf87ca37c9130a92051b5b0
insert-this-is-not-tiny-little = Questo non è un link di Ufficio Piccolo Piccolo, oppure è scaduto.
# en: 1eb05dc15f4e90a6a61c46b111812e974555cd81
insert-tiny-little-office-doc = Documento Ufficio Piccolo Piccolo
# en: 7bb236efe4e244196e506d65542626cfe368bb09
common-tiny-little-office-doc-ellipsis = Documento Ufficio Piccolo Piccolo…
# Insert ▾'s group of the apps a new document can be made in, inside this one.
# en: f9f93f3f14cfa3eea1bfcfee97ae22cd15b25e0d
common-new-document = Un nuovo documento

## another document edited in place (kit/ui/doc-dialog.ts); a table's size is Rows × Columns

# en: 77dfd2135f4db726c47299bb55be26f7f4525a46
common-cancel = Annulla
# en: 52d0b35277ee4b2b66ec4016620c658d99c7b57a
doc-rows = Righe

## charts (kit/draw/chart.ts)

# en: 7b6451ab3171ebc15cd43dfe0d80c1a0062c902e
chart-empty-chart = Un grafico vuoto
# en: ad5fb3b6084bf40286ee5437a7f894e0088a499d
chart-bars = Barre
# en: eb911036281c4d6d5c0b067a7951e39b0aca7b63
chart-flows-sankey = Flussi (Sankey)
# en: ecbdb15a7119ffa05cdc38ee38e20c129e28a8bc
chart-flows-list = Flussi: { $list }.
# en: c6fd3870c86e7422a0146e1e2a052437fb8e51e2
common-lines = Linee
# en: 5a2f5ac996eef952d239a22e8d68296faf975994
chart-nothing-to-chart-yet = Ancora niente da mostrare nel grafico
# en: 7631740b7c7b5a09ad168ae28580b5c9ca4b8c06
chart-nothing-to-chart-yet-rows = Ancora niente da mostrare nel grafico: righe di Da | A | Importo
# en: 9318d4f63aeffddc47d4520c722ad70f0ec6c63a
chart-pie = Torta
# en: 40c20d94e78fa142819df8cc9440d30e65329975
chart-series = Serie
# en: 79b2c4ce6295c191bf1031160055f59fb8174174
chart-kind-chart-data = Grafico: { $kind }. { $data }

## the Spreadsheet

# en: 12acc4f41c4ad8ed5996ac33a2f066e024ba1c65
sheet-clear-these-cells = Svuota le celle
# en: c527ea0aeba3f2d0104802279fed7e595157b78e
sheet-fit-this-column-to-its = Adatta la colonna al testo
# en: b92fe41ac34453cd0368f0fa5d00d1e9b0279c12
sheet-cells-in-hand = Celle selezionate
# en: 119faf17cd1de268ce34ade4f9bae4520774f640
sheet-check-ref = Spunta { $ref }
# The column type that holds words as typed.
# en: c3328c39b0e29f78e9ff45db674248b1d245887d
common-text = Testo
# en: cc6fdf1b0963eceb567d2f5b641f4950751636eb
common-spreadsheet = Foglio di calcolo
# en: 469342764c059045df7b47882a77d96ceb261898
sheet-spreadsheet-lowercase = foglio di calcolo
# en: 7e53821f70ae16079c4a6a64c52a91fae645bc5f
common-numbers = Numeri
# en: 05634091c29d83162cee95ca003dc222a3bab8ea
sheet-spreadsheet-with-formulas-named-cells = Un foglio di calcolo con formule, celle con nome e grafici; tre colonne per cominciare, altre quando servono.
# same
# en: 7aeba4cd15b1afc5015285c0854f0edae2380d36
sheet-budget = Budget
# en: d99860b75cc866415325dd845f03e65f1b9fc648
sheet-planned-against-actual-line-each = Previsto ed effettivo a confronto, una riga per voce, con la differenza e i totali.
# en: 0a0a7c3be7656f55cd259d558c2d0eb59b893b88
sheet-expense-log = Registro spese
# en: c2effbb05c6382e67befb796de9be3ad264a1cbb
sheet-date-what-how-much-which = Data, cosa, quanto, di che tipo; un totale progressivo in fondo.
# en: a2d841e763d975477b0e1a51d15e6f25c9023d4a
sheet-training-log = Diario degli allenamenti
# en: d5b29b7fbac7da4d79a420a8108f0c98bb1ab61a
sheet-what-you-did-and-how = Cosa hai fatto e quanto, una riga alla volta; un totale per ogni tipo di cosa.
# en: 4d89a20e90ff128c4329c067414e272156b4b196
sheet-project-tracker = Piano di progetto
# en: a9f287fb1ede11b35e739a207cac5eddcfd2116d
sheet-tasks-with-owners-start-and = Attività con responsabili, date di inizio e di scadenza contate da oggi, giorni di ciascuna, come va ognuna, e una spunta quando è fatta.
# en: 83c8cb0557f1a8ab76094b2801ae0b4cd23e4741
sheet-loans-compared = Prestiti a confronto
# en: 8ae3fb1476eab673ec96c9e2614cad18cbd6f497
sheet-amount-rate-and-years-for = Importo, tasso e anni per ogni prestito; la rata mensile (PMT), quanto costa in tutto, e gli interessi.
# en: 53f4e4eb1a489c6a14658993062fc985a80bd775
sheet-subscription-business = Un’attività in abbonamento
# en: f14ffb32b12ec6d73e3971054ddf5248de50852a
sheet-visitors-who-sign-up-pay = Visitatori che si iscrivono, pagano e restano: un modello a flussi, con le ipotesi accanto da cambiare.
# en: 2f6636a8892aa5d7f9781b630c2131dc8652a7f1
sheet-cafe = Un bar
# en: ce157b2ac144f603ec936234eb69d9d524c3354f
sheet-customers-day-what-they-spend = Clienti al giorno, quanto spendono, e dove vanno gli incassi del mese: forniture, affitto, stipendi, utile.
# en: 27f8244e11467491805da5dcaace666e1176df07
sheet-freelancer = Un libero professionista
# en: c7da5aec39e9bdd23c061f2f34a9ecb65f9f20a2
sheet-hours-rate-and-weeks-make = Ore, tariffa e settimane fanno le fatture dell’anno; si tolgono spese e tasse; quel che resta è il netto.
# en: 53ca3d56131df7985cdd58b24a369278bce0d723
sheet-mutual-aid-fund = Un fondo di mutuo soccorso
# en: 4df80f44a8c21f77f84393546555c9ab3224fe85
sheet-monthly-donors-and-one-off = Donatori mensili e regali una tantum riempiono il fondo; da esso escono contributi, un po’ di amministrazione e una riserva.
# en: 992dbb972d7850082f91f3f43d7b68391091a32e
sheet-month-by-month-with-chart = Mese per mese, con un grafico
# en: 876c69fa93189c4e89f57aeec964d0573e61be81
sheet-this-year-against-last-line = Quest’anno rispetto all’anno scorso, una riga al mese, disegnati come linee.
# en: 467dda8775e7e01a3dacd9ff5d247da7caf931d3
sheet-household-budget-by-month = Budget familiare per mese
# en: f61119c5b20c1ed2360f6aa2b583872a1fc9c474
sheet-six-months-of-homes-bills = Sei mesi di bollette e spese di una casa, una colonna al mese, con i totali per riga e per colonna confrontati con lo stipendio.
# en: 2c2609efcdcac42f94b3d73758d40d3f2f79dfd8
sheet-savings-goal = Obiettivo di risparmio
# en: 49ff61e9d2d6e99106df2e02e7a626aa5186c112
sheet-what-went-in-each-month = Cosa è entrato ogni mese, quanto è già messo da parte e quanto manca, l’obiettivo accanto da cambiare.
# en: ca1ec97c50f7647ef3588d5de58af33939c01646
sheet-habit-tracker = Monitoraggio abitudini
# en: 7a2638dee7c38146953a64566dbd8fc8ea77d8d4
sheet-four-habits-checked-off-day = Quattro abitudini spuntate giorno per giorno per due settimane; quante ne sono state rispettate ogni giorno, e per quanti giorni ciascuna.
# en: d80f6ec7eac0c80248e2c7b452e21f89673449f2
sheet-reading-list = Elenco delle letture
# en: c809293d68f1061cf7062072d2efc8fe95fe9262
sheet-books-read-being-read-and = Libri letti, in lettura e prossimi, con i giorni che ognuno ha richiesto e le pagine lette quest’anno.
# en: 6e14850d9abea09c879f881a4773537f91cf2ac2
sheet-workout-log = Diario di allenamento
# en: b2a1db48bce10aa5ac4b8eb894555098ecbaac30
sheet-sets-reps-and-weight-for = Serie, ripetizioni e peso per ogni esercizio, il volume calcolato, e com’è andato ciascuno.
# en: 5be9810c81e208adc153f7aa0cc70f64c988d737
sheet-time-sheet = Foglio presenze
# en: df9c77cdd1cdf96f00633ef7f822543a7185dbc6
sheet-weeks-hours-by-client-and = Le ore di una settimana per cliente e attività; quelle fatturabili al loro prezzo, e i totali.
# en: da7a3e11a9c1686127720177adfd2bbfed7224e0
sheet-trip-costs-split = Spese di viaggio divise
# en: bcc455f94ab37c41dad441a4152ac7961c3118ad
sheet-who-paid-for-what-on = Chi ha pagato cosa in un viaggio in quattro; la giusta quota di ciascuno, e quanto deve ognuno (un segno meno vuol dire soldi da ricevere).
# en: 3fcd3bd6c3c0517dc23b7c9c8a424a6ba7c30c9a
sheet-schedule-with-dates = Programma con le date
# en: 9cfdf52e38ee970ebd6feac438c7d2cb6abd25c5
sheet-job-in-steps-each-starting = Un lavoro a tappe, ognuna parte quando finisce la precedente: chi, quanti giorni, la data di fine e i giorni lavorativi.
# en: 2a3b772f6e347425b5a235a2e956004ed5177213
sheet-grade-book = Registro dei voti
# en: 0e6fce40b16529c27d306da8834f33a391a5ca5b
sheet-classs-grades-for-essays-quizzes = I voti di una classe per temi, verifiche e un progetto; media e voto di ogni studente, e la media della classe.
# en: 7d9ac107a69e997e571bd6906b535f6802bc5569
sheet-membership-roll = Elenco dei soci
# en: 3bc0a32ca3d296ee9217f44adf3cf4d3c3dbd080
sheet-who-belongs-their-plot-and = Chi ne fa parte, il suo orto e il suo incarico, quando ha pagato e quando rinnova, chi ha una chiave, e le quote incassate.
# en: b884fda377a19ce445f8ec49bd90f2784834978c
sheet-seating-count = Conteggio dei posti
# en: 4e00db4efd970061e8ff6cd63f723c7385ad1637
sheet-tables-for-wedding-seats-guests = I tavoli di un matrimonio: posti, invitati, posti liberi e i menu scelti, con un controllo che i menu tornino.
# en: 8a535a1def73648a0a55a9bfa21c9d370e434ce5
sheet-poll-results = Risultati di un sondaggio
# en: df60ac32ce5b04bf11e53f97d296db53c2a2cda2
sheet-answers-and-votes-for-each = Le risposte e i voti per ciascuna, disegnati a torta sopra di esse.
# en: bfee938677dd9bf5dab2de4f9558c07a06d616fd
sheet-fundraising-thermometer = Termometro della raccolta fondi
# en: f6873b16e788104f3e409c1c06243db77d2a6e04
sheet-what-has-come-in-week = Quanto è entrato, settimana per settimana, rispetto all’obiettivo: un grafico sopra, il totale finora in grande.
# en: 20ded69e290360ef0be6b1fd22e648ca398d7ed3
sheet-invoice-ledger = Registro delle fatture
# en: 2404f6c1a633f188d6395d7b35f7dd1486c597b6
sheet-every-invoice-sent-when-to = Ogni fattura inviata: quando, a chi, per quanto, quando è stata pagata, cosa resta da pagare e con quanto ritardo.
# en: 300d29fd5f327e8c7a0f4614d4125d93570eeeff
sheet-inventory = Magazzino
# en: cca3ceb6d79e8c2e922aa21c8675223c1b96c275
sheet-stock-on-hand-against-point = Scorte disponibili rispetto alla soglia di riordino; cosa ordinare, quanto vale, e un segnale quando sono basse.
# en: ba8d2875e56e1ee2a745057f4de807182be4bb9b
sheet-petty-cash = Piccola cassa
# en: 8c7a0a9d0703152466c522d2d8bbd55cfcea218d
sheet-money-in-and-out-of = Soldi che entrano ed escono dalla cassetta, chi li ha spesi e per cosa, il saldo dopo ognuno, e una spunta per la ricevuta.
# en: dca1686c53daf52f46495f2a961a3346006e41ac
sheet-rate-card = Listino tariffe
# en: 1a3c8694038b9c6d56a26e131d62c3616e165a77
sheet-freelancers-services-with-hours-each = I servizi di un libero professionista con le ore di ciascuno; prezzi e prezzi urgenti calcolati da una tariffa oraria.
# en: b9d1a465f75615e0b55ff620ec057c608971b8ed
sheet-mortgages-compared = Mutui a confronto
# en: 43ecdf4a244c2e1c022c6c08a3ba1c07f107ece3
sheet-four-offers-on-one-house = Quattro offerte per una casa: il prestito dopo l’anticipo, la rata mensile, il totale con le tasse, e gli interessi.
# en: 54695e5df6ef00663252186d998a600f9bac4c58
sheet-unit-converter = Convertitore di unità
# en: d2e0c086c77046805d1cc8934044bb315bf00aec
sheet-miles-and-kilometers-pounds-and = Miglia e chilometri, libbre e chilogrammi, forni, tazze e galloni: scrivi una quantità, leggi l’altra unità.
# en: 9d2911edf283fc08872808d554a1017460fbe86f
sheet-tournament-bracket = Tabellone di un torneo
# en: ad907a82b59f9d64761c80d6b2fe13c2a3b04fc2
sheet-eight-teams-single-elimination-each = Otto squadre a eliminazione diretta: il punteggio di ogni partita, il vincitore calcolato, e i vincitori portati avanti fino alla finale.
# same
# en: 0e2d6a433d926deb1903e03f166c76cd50bd542d
sheet-excel-xlsx = Excel (XLSX)
# same
# en: 3281188351b89c8e2db28d6da7af4992d415de90
common-csv = CSV
# en: 795a4ad3f904388d715a0384382b361f16342610
sheet-chart-svg = Grafico (SVG)
# en: 3001366084e5b141572a5a7b708f24fc835d2720
sheet-chart-png = Grafico (PNG)
# en: 492630372c601d63c25590ebdc75ab6f34a2ff74
sheet-empty-sheet = Foglio vuoto
# en: 2decd02b722b692c9d30d7de5e0c1191d1968de7
sheet-n-of-max-shown = ({ $n } di { $max } mostrate)
# en: 9e85be5a97dd107512bd06368b695b4265a662c9
sheet-50-more-rows = Altre 50 righe
# en: 46dd847f36799647b69659ed71327486c70728ea
common-add-column = Aggiungi una colonna
# en: dff758e7f1104295adde7af1bb92396f6c7c88a7
common-add-column-after = Aggiungi una colonna dopo
# en: 66c7734789e19cbeef3a5ac185ea732139aed213
sheet-chart = Grafico
# en: a0e276f06261f873cb144d086a0f3c33941f43f7
sheet-chart-of-table = Grafico della tabella
# en: 1d66c3d0758e71b315e012814dc35df62cfab9d2
sheet-checkbox = Casella
# en: 3c5512cb6f54f5f5483d681781a71d95982c8769
sheet-column-after = Colonna dopo
# en: 6d36997d9f52785865f243c2436502c328d12b1f
common-column-c = Colonna { $c }
# en: b4a57f5f40871854cb181f17a04c4e72c5c4048a
common-column-c-holds = Tipo della colonna { $c }
# en: b657e2a4e550834ea13d1026bf21694fb9a65c3c
sheet-column-c-type-what-it = Colonna { $c }: { $type }. Tipo, ordina, aggiungi o rimuovi
# en: cf723c59b62a173547c39c3d661c4ee7c240bab1
common-columns = Colonne
# en: 40c14f884fe7e5b4e58ea4bd6f6d522bae43134b
common-delete-which = Elimina { $which }
# en: 51f5ba33dabbc2c8aa4e3e640e0b27cb55aea1be
common-drag-to-fill = Trascina per riempire
# en: 87b8f44339c3a345782b1fa838bfa3b0406567b3
sheet-abc-or-123-for-this = Tipo di colonna
# en: 69ff8ba19299f697ed3f5401bb7c03f0abbc4c67
sheet-drag-to-resize-double-click = Trascina per ridimensionare, doppio clic per adattare
# en: 363a9922cf56c76397d7b72ae8425d30d0438b33
sheet-fill-down-from-top-row = Riempi in basso dalla prima riga
# en: 549a401f55bc461388a4f5f8554db5e0749d0a28
sheet-fill-right-from-first-column = Riempi a destra dalla prima colonna
# en: 51f5ba33dabbc2c8aa4e3e640e0b27cb55aea1be
common-fill-drag-to-carry-these = Trascina per riempire
# en: 4425eb9442fea0435d290b7a34f1ad8a6980e789
sheet-fit-columns-to-page = Adatta le colonne alla pagina
# same
# en: 720f58fb1f9353ab3c904b888ccb774c40393e06
sheet-formula = Formula
# en: f1e410ad1472b42cb42cc98962428637290b6706
sheet-function = Funzione
# en: 4c0ab96e8dd44e528589261be865f136fcbae564
sheet-high-to-low = Dal più alto al più basso
# en: 22c03da74b04607929f25258870ac2571a1b46bf
common-insert-n-rows-above = Inserisci { $n ->
        [one] una riga
        [many] { $n } di righe
       *[other] { $n } righe
    } sopra
# en: 5e3141f35e5d110b9f6303876cf866971f689046
common-insert-n-rows-below = Inserisci { $n ->
        [one] una riga
        [many] { $n } di righe
       *[other] { $n } righe
    } sotto
# en: ae3b3fa65ff4f34adbaf5d76e694293bb2059fbf
sheet-letters-keyboard = Tastiera alfabetica
# en: 7177342b32d961e7d51feb4571231982a48a0772
sheet-lock-these-cells-so-reader = Blocca queste celle perché chi legge non possa modificarle
# en: 893190219ca26f4bad6f2395b91da6295cab23b6
sheet-locked-part-of-model = Bloccato: parte delle formule del modello
# en: b1b588e8ffba9c37d560f4b4d63c6344d009ce2e
sheet-low-to-high = Dal più basso al più alto
# en: 1dc043bb8eb5646851ff808477bb5d3573739f1c
sheet-money = Importo
# en: 709a23220f2c3d64d1e1d6d18c4d5280f8d82fca
common-name = Nome
# en: 3f37ebdc04c6216818bd5bbf8724175546a880c8
common-name-of-column-c = Nome della colonna { $c }
# en: c103a2458adcf85547000188a915ccb91f45ee9c
sheet-names-cell-to-its-right = Nome per la cella a destra
# A money column's currency (Money picked in a column's menu): the field's hint, and what it says of words it cannot read.
# en: d02550533b8780a7e646803c3b7b9cb7a78ba756
sheet-symbol-like-or-code-like = Un simbolo, come $, o un codice, come USD. Se è vuoto, vale quella del documento.
# en: 1224b5538c873fc11d856120fedeb76e516529c6
sheet-symbol-of-up-to-three = Un simbolo di al massimo tre caratteri, o un codice di tre lettere.
# en: 630470a61228c20119f270074f1e0b6a4c2d9151
sheet-no-chart = Nessun grafico
# en: b7baa1d40c4ea29afc9098732bffee2a861a6c44
sheet-number = Numero
# en: 80838be5576c4b333f764e352ef9e6c5292b2b78
sheet-open-link = Apri { $link }
# en: 1d6f3ce763f138e0025747a9d3ae7f30efc75531
sheet-opens-when-clicked = Si apre al clic
# en: ac556cf5938d2104533c38103305f6cf60ba245d
sheet-percent = Percentuale
# en: 4f9fa8ea1af8cde7cca877c50ca723eeadee35dc
common-remove-this-column = Rimuovi questa colonna
# en: 12ee6fe44798c4fe94090bef612f25e903d9cd15
sheet-resize-column-c = Ridimensiona la colonna { $c }
# en: fa84cb8f7793313625378f4a9caa43b1abbf650b
sheet-rich-text = Testo formattato
# en: 45c89f220501dfd15e267bf7d636dc7a76526971
sheet-row-above = Riga sopra
# en: 9be9bf4f94705d404df5c715fda96ae93fda7494
sheet-row-below = Riga sotto
# en: 95d5eb6f6a50994282979432eb3c4dc5836db2e2
common-row-n = Riga { $n }
# en: 7d69f57d4baecc18e3e40be8d939c9d2cbc2e2f1
common-row-n-lowercase = riga { $n }
# en: 8fcfbe7f09950cb9105bd4280c43ee2524090dcf
common-row-n-insert-or-delete = Riga { $n }: inserisci o elimina righe
# en: 767a59f7f0079a019b266853b864269f92d10d82
common-rows-b = righe { $a }–{ $b }
# en: b92fe41ac34453cd0368f0fa5d00d1e9b0279c12
sheet-selected-cells = Celle selezionate
# en: 26b30f90bad8aab892824738a0dc60bd11d082be
sheet-show-all-text = Mostra tutto il testo
# en: 9580fcbce0c31ceaa47eb583e5f7ce637fdc8a0a
sheet-shown-as-typed = Testo semplice
# en: a2a5bdeca9391be1e0cdff1c19895bae7fadc2c2
sheet-sort-rows-by-it = Ordina per
# en: ff87bd67a9f3709f0a4247baa8ba4de4a5bd5fd2
sheet-suggested = suggerita
# en: eda0b8f3c389658a7369166fd4c36099e380adff
sheet-is-as-wide-as-it = Il foglio ha già il massimo di 26 colonne.
# en: 0f54b98f336606a21f0bcbdc77afa4474b2b1966
sheet-is-full-its-last-rows = Impossibile aggiungere righe: le ultime righe non sono vuote.
# en: 7a74dff615ee3bcbc90d8c31886f01082413c776
sheet-three-at-least = Minimo 3
# en: c97ecbf8fed8c8a3a0d51412e2e9bd4c8539ba26
sheet-unlock-these-cells = Sblocca queste celle
# en: 7e592be640ccac5b2bdf24df5b74d19326b5094a
sheet-what-it-holds-sort-columns = Tipo, ordina, colonne
# The Spreadsheet: any column removed, the Option column, rich cells, a chart put in from Insert.
# en: 63362bbc585e9e03cbf63abe945bcf99aa4d8cc5
sheet-keeps-one-column = Un foglio deve avere almeno una colonna
# en: 7208e66f41dd004e736a1840e2a99d288a4c2060
sheet-choices = Scelte
# en: 38b6d89278519f90efb25eb841096bc63d9095e0
sheet-choices-for-ref = Scelte per { $ref }
# en: a871e2c9206cb4854cc06c30bc6de95cb82f9700
sheet-has-one = Il foglio ha già un grafico
# en: f0dfb92a1f16391ab3bd5478ce9d8c0f2d74bf95
sheet-edit-cell-caret-at-its = Modifica la cella con il cursore alla fine
# en: 28d1a54d2e35ad87c0d19942f68d70ddbf67bcee
sheet-put-back-what-cell-held = Ripristina il valore della cella
# en: 2b69414b3787eaa8a38f2f1a9c4a48aff7dd78a5
sheet-put-dated-rows-on-calendar = Metti le righe con una data su un calendario

## downloads: hand-offs to another app (kit/file/exports.ts)

# en: f03b6f674b16abfbc970946d0781228b3407655e
export-open-in = Apri in
# en: 7f7b61c3d0574fa0bae27972834652c8b6f222e6
export-pdf-file = File PDF
# en: 20ab05206208a4e9bea088d36c6640c781c6bf65
export-copy-link-that-downloads-ext = Copia un link che scarica il .{ $ext }
# en: 389a8e30f70f547f507d418d67a8048c7eb2eda4
export-could-not-share-ext = Impossibile condividere il .{ $ext }
# en: 5869a7d435c371c52a7c02fe623f625c5062ba1c
export-could-not-show-ext = Impossibile mostrare il .{ $ext }
# en: b31bab5111d8c6e8c5b51deffa133f4e7063ec37
export-download-ext = Scarica il .{ $ext }
# en: 6d92cb44456263f51e52b62171b3602b54c5fec0
export-share-ext = Condividi il .{ $ext }…
# en: f9b579ae7d7104f25e1800d18a5b3e89343618cb
export-view-ext = Vedi il .{ $ext }

## the icon library (kit/ui/icons-picker.ts)

# en: 716f63b96e0c263222949a3b8a00cdb4f46d3183
common-icon = Icona
# en: 07b3e447db02b7cc20a78a57c316febae22ed72b
icons-favorites = Preferite
# en: a8b63bb6a000ce6560e6126bf0fade0a56fef128
icons-search-icons = Cerca icone
# en: 7fcd8d44c6f295423534073543e6050ddd8cf497
icons-suggested = Suggerite
# en: edb8f6c14252759cd8673c61a24376d32e17b93a
common-icons = Icone
# en: 7d9b3876b6aa451cf6a99a0323e97ba79d6a4a27
icons-no-icons-match-q = Nessuna icona corrisponde a “{ $q }”.
# en: 213898967018ae7e0c3b4bf96e59877f9d434ca7
icons-search-by-name-or-by = Cerca per nome o per significato (“soldi”, “meteo”, “ai”) per trovare una qualsiasi tra { $n } icone.
# en: 95553ba8a4056a6f9817d2dbbf0be4c66d9eacd7
icons-no-icon = Nessuna icona
# en: 1935c7dc9183bd8f7d4987f70ff5592b29d45397
common-icon-or-emoji = Icona o emoji
# en: b37554f695b15005fd23907b9488e0a8ad4bca5f
common-people = Persone
# en: 1699cec34f8ca2d63e0b366fc1fe83d5de3a0c13
icons-search-icons-and-emoji = Cerca icone ed emoji
# en: da588993ff27cbb60e3c1cecefb192d389748ef0
icons-or-emoji = Icone o emoji
# same
# en: 5090a9e78c899272a10648b39e7689bc40072825
icons-emoji = Emoji
# en: d30201283cf13108c4beeb8c7c1787e5cda37590
icons-no-icons-or-emoji-match = Nessuna icona o emoji corrisponde a “{ $q }”.
# Unicode's emoji groups, as the picker's Emoji set names them.
# en: d883a36d4ea749e2946b208450185bccfbca11c2
icons-smileys-emotion = Faccine ed emozioni
# en: 45f4db9fab3599be7af02e3a58af52988789725d
icons-people-body = Persone e corpo
# en: fee7d0c1beea3c67c9a835315496da822a22e839
icons-animals-nature = Animali e natura
# en: a9704a2ad9afea5f9d4d1504458f91e253557264
icons-food-drink = Cibi e bevande
# en: 4cea7e0a28a73fafbe052e8132f1c86cd07a68ed
icons-travel-places = Viaggi e luoghi
# en: e58f7f889902c81b8879128fede278022f0e459c
icons-activities = Attività
# en: 72a83add2c5ede877c10d23f302d3e17accbadab
icons-objects = Oggetti
# en: 22ad664e9eb98b75a73333b2b2395fc4b52e6fc9
icons-symbols = Simboli
# en: 5d728758adcdd5154d3be55552c1c061ef1489b2
icons-flags = Bandiere

## the Drawing Tool

# The group heading the Drawing Tool sits under on the home page: Design. 'Draw' is the Animator's mode for drawing.
# en: bfa50c7a3838fc883b8f4fd701b280e77a3952ea
draw-draw = Disegna
# en: 51c99e5a9ce98b2b6990b55b10a46d2fd23a18f1
common-drawing-tool = Disegno
# en: f4f99578c04e974810cdd12ceb7ae902de7291d3
draw-drawing = disegno
# same
# en: 59b035367211a9382930b2a4c13637dbc33c4f32
common-design = Design
# en: 0077c4c9a2bcb4318b7a85a034bc75912afc3cb5
draw-boxes-arrows-icons-and-labels = Riquadri, frecce, icone ed etichette su una griglia; oppure pixel art, che può diventare una tessera di sfondo.
# en: b807ee7758852c19e577610f2c56bf3ee0fb29bb
draw-request-flow = Flusso di una richiesta
# en: 00cbc89498c2f280038a754777730896717e8071
draw-browser-asks-server-which-reads = Un browser chiede a un server, che legge i dati: riquadri uniti da frecce.
# en: 0b2cbbcb4742328b0a7288f1b69223de737b2d15
draw-flowchart = Diagramma di flusso
# en: f7a7e4b122a1c6db709d59b923a8e915ae67c9b3
draw-three-tiers = Tre livelli
# en: 8d884dc3538d977a76ea897e377b897d4b3cdc0c
draw-phone-and-laptop-api-database = Telefono e portatile, un’API, un database e una cache: un sistema disegnato con icone e collegamenti.
# en: d5786d3d397a91b189e23529401c4f8d35cd09b0
draw-floor-plan = Pianta
# en: fddd68346c75bb66ad003c667e573feb965f7ca4
draw-one-bedroom-apartment-from-above = Un bilocale visto dall’alto: stanze come rettangoli, con etichette, e le porte come varchi.
# en: 38a0d171dc9e21d8e32aacfbb8a170dad9977d9c
draw-pixel-heart = Cuore in pixel
# en: 7f51a7b112b9965b1cf5d78f9b43f76de5ad8f0d
draw-16-by-16-heart-in = Un cuore 16 per 16 in pixel, da colorare o da cui ricominciare.
# en: c65ee0720b3ba1dac7268415c7c987faabecc4a8
draw-background-tile = Tessera di sfondo
# en: e78fb3ca7b230e0df30391c85eec105bf55656bd
draw-8-by-8-pattern-that = Un motivo 8 per 8 che si ripete: usalo come sfondo di un disegno, o di una qualsiasi pagina.
# en: 99cb45a6f4e975a5a7be78811422b5933dd6598b
draw-card-for-ninetieth-tilted-on = Un biglietto per i novant’anni, inclinato su uno sfondo di coriandoli: parole grandi, fiori, un abbraccio da tutti.
# en: 2020c98a00da0ecd8574350e226b7d4c448a451f
draw-phone-screen-sketched-in-boxes = Lo schermo di un telefono abbozzato a riquadri prima che qualcuno lo costruisca, con note sul perché di ogni parte.
# en: 106c289912d69f2f02f64b1c195daa945a29c19f
draw-rosette-with-ribbons-for-volunteer = Una coccarda con nastri per il volontario dell’anno, da stampare, ritagliare e appuntare.
# en: c9c7469b74c0a43646cb4a46279d9930b271ca19
draw-block-party-from-above-stage = Una festa di strada vista dall’alto: il palco, le bancarelle, il primo soccorso e dove trovarsi se ci si perde.
# en: 6d12c8adbefeaeacac0d48274df3a195ca9a1d17
draw-badge = Distintivo
# en: 32787c0201e95e7dd6ca00aa5dd63210e278e3db
common-birthday-card = Biglietto di compleanno
# en: be3883124104a86065f65c46fcf4edff20e0842f
draw-can-we-refund-it-stores = Possiamo rimborsarlo? Le regole sui resi di un negozio come domande, risposte e cosa fare.
# en: 619a6e052e5343b8fbad2bfbc5a35d0aa4ec763f
draw-event-map = Mappa dell’evento
# en: 6349ac251c1b86c4744c7e0361a5e72ea5e38402
draw-four-16-by-16-icons = Quattro icone 16 per 16 su una griglia, sole, nuvola, pioggia e temporale, da copiare per un meteo o un pulsante.
# en: 9c6396f6f0d3ea9cb4720d61fecd3ede243d72c8
draw-game-sprite = Sprite di gioco
# en: 8752fbad4e546cb5ffe343544f280f98fc20d43f
draw-logo-sketch = Bozza di logo
# en: 26dbc52edd1d138f4ab006d860b56dee54bf919f
draw-order-to-doorstep = Dall’ordine alla porta di casa
# en: 9bdb2a0b447519986c24ccc21eaf68976587c9fc
draw-pip-frog-32-by-32 = Pip la rana, un eroe 32 per 32 con una sciarpa rossa, con il contorno, pronto da animare.
# en: d8cca3dd62ad1e4c37a8b10c054464bbcb13e3c9
draw-room-plan = Pianta di una stanza
# en: fcba7b3fe14a456c5dd428b4e0b28552efa25751
draw-living-room-rearranged-sofa-rug = Il salotto risistemato: divano, tappeto, libreria e scrivania in scala, con l’apertura della porta disegnata.
# en: 8640aa92343372c68f5d72660821c342598d8b38
draw-three-ideas-for-coffee-roasters = Tre idee per il marchio di una torrefazione una accanto all’altra, il nome in grande, e una data entro cui scegliere.
# en: 68224d905ee1bc5c63082121b1e80cf6fe7d08c1
draw-weather-icons = Icone del meteo
# en: 0d07d8bcde49fe88082ab75f75e2fd49bbcef253
draw-what-happens-to-package-from = Cosa succede a un pacco dal momento in cui viene comprato: un processo a tappe, con icone e collegamenti.
# same
# en: a5be156d0e860e683861363db9d3c32c664ca943
draw-wireframe = Wireframe
# en: 3e8785ece820edb3b53646af4cc1d4e3d40e13cb
common-picture-svg = Immagine (SVG)
# en: 833ba107dc3d58db8b9f35a717d7bd43c83a0817
draw-background-tile-svg = Tessera di sfondo (SVG)
# en: 34f2e94dc9cb747e7afc204c645943fa3ab68196
draw-background-tile-png = Tessera di sfondo (PNG)
# en: 75f5b48c5980dd2997738dd7416aa5fe8ca60e9a
draw-animate-this-drawing = Anima questo disegno
# en: a42ec2578a2a55cc28dcfbd53e3c34dee5d31d78
draw-drawing-of-things = Un disegno di { $things }.
# en: 2759692cb0d64c0c370b6516074bb1de744a31a2
draw-drawing-of-n-unlabeled-shapes = Un disegno di { $n ->
        [one] una forma senza etichetta
        [many] { $n } di forme senza etichetta
       *[other] { $n } forme senza etichetta
    }.
# en: f33cdbb01b5b65fe3fe8928669d13ca09b3b5403
draw-leads-to-b = { $a } porta a { $b }
# en: b9e37b62382792094f5463a54183d523118a25a0
draw-joins-b = { $a } si collega a { $b }
# en: e0883468badf6a5f9c1cfe0ce209a16939a64683
draw-empty-drawing = Un disegno vuoto
# en: 1f9c4a5ed21a39ed45db86eb13cbff389eede2cf
draw-pixel-art-n-by-n-filled-squares-filled = Pixel art, { $n } per { $n }: { $filled ->
        [one] un quadretto colorato
        [many] { $filled } di quadretti colorati
       *[other] { $filled } quadretti colorati
    }.
# en: 2aafc8e9796ba5ac5ccffa1800cf6c5ba65250fb
draw-pixel-art-n-by-n = Pixel art, { $n } per { $n }
# en: 8598222918d3c6e513d63060cf55e2971ded729a
draw-select = Seleziona
# en: c158695a64adb40952c1cf9fde78b62bd6147f42
draw-rectangle = Rettangolo
# en: 8580e3175f4eb7461a5fac359ee86cd4c559d555
draw-ellipse = Ellisse
# en: b3850e04b5cc10929206d2336efa79a041358d57
draw-diamond = Rombo
# en: ea9676003762818513c636984faeaa0ae356839a
draw-line = Linea
# en: 3a4758c3cc8dac2d76026d0733816741f9b21d43
draw-arrow = Freccia
# en: 24421a551f456e8f5bde7180378b590f0337c041
draw-join-two-shapes = Unisci due forme
# en: cf6c07e7054fad4d6a8affaf62f285e16525c46e
draw-pen = Penna
# en: c72e323a57434ede3b6eb0cc235109eb76833c55
draw-any-shape-tap-for-each = Poligono: tocca ogni angolo
# en: 016a5405a0b425e7d1ac65317df59b45ce5fb1f5
draw-freehand = A mano libera
# en: 8a48ec1f6c073fad0326a0e9251a18e4c88660b5
draw-drag-to-draw-line-or = Trascina per disegnare una linea o una forma
# en: dcd096d38fc0be24bd96ac76246e98341b853208
draw-rounded-box = Riquadro arrotondato
# en: 08596d60c57fd87e530cbdd2a06052b06d8c4137
draw-hexagon = Esagono
# en: b116d77a368034d3de6ca1dc0414de7dfd49400b
draw-parallelogram = Parallelogramma
# en: 817b354dc01a34895eab0c37e21af38dc0850d08
draw-cylinder = Cilindro
# en: 2c924e3088204ee77ba681f72be3444357932fca
common-note = Nota
# en: b406fb57b29fc76f71864fbb37f0238045f84d9d
common-black = Nero
# en: cc9db3a795571c7e71f45670a1da7ff49b5f1557
common-red = Rosso
# en: 09fb6aaba7940a7b7ffdbc9cbb9b3498303c1bad
common-orange = Arancione
# en: 933bf21afdd55a0d2283845fed0e7bbdd1f5db49
common-green = Verde
# en: 7d44bc449c2a26374800a503f10f3d8949505f40
common-blue = Blu
# en: 32576f4fedc07f63020353af6a8aac66c4452c4c
common-purple = Viola
# en: 3b4e294693563cc45de95b9db8b4abeabfac77db
common-indigo = Indaco
# en: 3526f607bcd4f51ad0bc05f814579a42c2c0ba57
common-yellow = Giallo
# en: b3d97fd6dece388a968e367f3ac4b9e64d739f52
draw-sky = Azzurro
# en: 54076359fdc7f1f0e000b9ae15b96f8b09866acb
draw-pink = Rosa
# en: 168cbb2ea52b9e34d271accecfa7d7951e948a99
draw-clear = trasparente
# en: b1985e387405e4d4afb40d5dac9b2656f5d6f770
draw-shapes = Forme
# en: 4bab2d8fe13fa6ab57f80098b414f0f734c5dd25
draw-more = Altro
# en: 34f9968677e8b728f4405bf338fba32c66bd2a77
draw-icon = Icona…
# en: 64dd60fe1a049fe6db3eb1369dec2e42bf428e21
draw-background = Sfondo
# en: e1946387893c804aeadc93e5df5af3416cf1dc53
draw-remove-background-tile = Rimuovi lo sfondo
# en: 1d0c8304baedcf8e3a78982c2e7c0b04622bf2a0
draw-color = Colore
# en: cfdd099c4751f2f9aef2491f411111906956e0f2
draw-arrange = Disponi
# en: 8c4e184c7224521ecdb958ef6eb40a05b5171f9a
draw-no-fill = Nessun riempimento
# en: 7adb6736cf2c9ae017b128f98738ffbae0e58655
draw-fill = Riempimento
# en: 1f65ed95fba62cd5b74b58c2ca9ba63448117160
draw-bring-to-front = Porta in primo piano
# en: e259d4e19e695a41e2f10680f2e3f5693711382a
draw-send-to-back = Manda in secondo piano
# en: 972d57379db3e5be76d4ead709fef1ad71ff03d6
common-duplicate = Duplica
# en: 5301648dcf6b53cefc9ed52999aaa92d4603cae0
common-edit = Modifica
# en: f6fdbe48dc54dd86f63097a03bd24094dedd713a
common-delete = Elimina
# en: d7bc7e98ec7a8acfd61dabe29e1e9156adf86fb9
draw-put-icon-on-this-shape = Metti un’icona su questa forma
# en: 33bde816f0f7a53b8de67b8f8d6981f47e28159b
draw-place-icon = Posiziona un’icona
# en: 4fc05f2763ba31e2d3be5f08e7d0bab5d5dcbf78
common-zoom-in = Ingrandisci
# en: a4ae4b24a1f5369c2bff61abdbc221170e4b27d8
common-zoom-out = Riduci
# same
# en: e30eff925100b7c3e119ed678e39009e962455b0
draw-alt = Alt
# en: f978200b112084eef0c088e1d0075ad2fbca39cf
draw-alt-text = Testo alternativo
# en: 5cb1c64554b7e1dc72e12360f2d04f33dc206b1d
draw-alt-text-alt = Testo alternativo: { $alt }
# en: d039700b1af48db561cd71c056aed2737e8fae32
draw-add-alt-text-describe-this = Aggiungi un testo alternativo: descrivi questo disegno per chi non può vederlo
# en: 676f1e162fc4f58007821f7c1a55b893e9a04715
draw-what-does-this-drawing-show = Cosa mostra questo disegno?
# en: c8636572fb4b9e79bae4c9fef82fc8109961c471
draw-diagram-of = Un diagramma di…
# en: 5a33f2e7e84274a5291191ca3105e62d897eee0e
draw-read-aloud-to-people-who = Letto ad alta voce a chi non può vederlo, e conservato con il disegno ovunque venga incorporato o scaricato.
# en: 988c63b77eade4f718f9d469cb36e35bff976839
draw-describe-from-shapes = Genera dalle forme
# en: ac302ae45938c985822f097507602d624128f1d0
draw-tap-or-drag-to-paint = Tocca o trascina per colorare; le frecce spostano, Enter colora.
# en: ea263dc45b04f2755ac61a51deecc96ade3fb6a9
draw-tap-each-corner-tap-first = Tocca ogni angolo; tocca di nuovo il primo, o premi Enter, per chiuderla.
# en: ccdc55c46a79ea604962ddda9cc010311bdca4fe
draw-drag-to-draw-end-where = Trascina per disegnare; finisci dove hai cominciato per chiuderla in una forma.
# en: ef5a6074bd843b506d359711212e8236802d80c4
draw-press-on-one-shape-and-let-go-on-another = Premi su una forma e rilascia su un’altra.
# en: 1005cc8c1dafc1f9eb422bf2ac68290b492fdfd1
draw-now-other-shape-tap-it = Ora l’altra forma: toccala, o sceglila con le frecce e premi Enter.
# en: e3686f1c55ec91e31825e1d9510abf592d80b08a
draw-drag-to-move-them-together = Trascina per spostarle insieme. Shift+tocco aggiunge o rimuove una forma.
# en: eb36764c60ec7a17dd6ac3ec7dbbd22ee401778e
draw-press-on-one-shape-and = Premi su una forma e rilascia su un’altra
# en: 199f4e86afea4f2d42eb40b63ce8599168575e06
draw-tap-where-icon-goes = Tocca dove va l’icona.
# en: 86da5e24511bad8c1cace935e830c0625b04b607
draw-drag-on-canvas-to-draw = Trascina sulla tela per disegnarla, oppure tocca per posizionarne una.
# en: a5742851f0f81d3bdcf184cb2a164390f3e989bb
draw-eraser = Gomma
# en: 5136ae1b5bfe9175a6ed64915e648bdc240443a7
draw-pencil = Matita
# en: d60e52fb8066ebf1bf1329750c068e7042c783fd
draw-clear-grid = Svuota la griglia
# en: 45ecea7c16e725c14cfec68f5b12d1545f222a73
draw-use-as-background = Usa come sfondo
# en: 507f52dfd67fb731677bb9ae6971f9b5e891bc84
draw-grid-is-now-background-download = La griglia ora è lo sfondo. Scaricala come tessera, o usala in qualsiasi pagina con tile:.
# en: 209a1a74ee8eec09b861bc34e5ddb08a1357a364
draw-pixel-grid-n-by-n = Griglia di pixel, { $n } per { $n }. Le frecce spostano; Enter colora con il colore attuale.
# en: a9deda2292f9b3c9a827e2aa71e0da6b4db9f16e
draw-row-y-column-x-ink = Riga { $y }, colonna { $x }: { $ink }
# en: d316afce8845f59e541c981d07d81bab22858d00
draw-as-repeating-background = Come sfondo ripetuto
# The contextual bar under a shape, and its words typed on it.
# en: 27bb3dadbebca64cec249a9811a07cd3ea25a520
draw-dashed-line = Linea tratteggiata
# en: 8953b1fb5c8eeda2158dfd09bde1a766d4b9079d
draw-dotted-line = Linea punteggiata
# en: 6597b9e38708468a6ada223bbd324b34dd9b8d23
common-edit-words = Modifica testo
# en: 73a03229ad334f953ab9119481b53f881218d015
draw-extra-large-text = Testo molto grande
# en: a489f3e9ff96e710da6f0dad589e2e4f58ba2dde
draw-gray-fill = Riempimento grigio
# same
# en: d160e0986aca4714714a16f29ec605af90be704d
draw-l = L
# en: d7f442ef62cb3d9ac929d5c992b5daf0ca7721d3
draw-large-text = Testo grande
# same
# en: c63ae6dd4fc9f9dda66970e827d13f7c73fe841c
draw-m = M
# en: 3142905be6683e711043cf1317f0beb5a495ee4b
draw-medium-text = Testo medio
# same
# en: 02aa629c8b16cd17a44f3a0efec2feed43937642
draw-s = S
# en: 11cc69c6f994eeb6dd90a55a7ce3bbc682544f87
draw-small-text = Testo piccolo
# en: 6e9a379022a3fda2be5039485a0a092130c73f70
draw-solid-fill = Riempimento pieno
# en: dcfb9c041348e0d62c058f37225ad2185472edc8
draw-solid-line = Linea continua
# en: b233a397b799e80f21b88a34ae7e30af0528d1c1
draw-shape-in-hand = Forma selezionata
# en: 6be4ddf808de37e8c50aae4f621dd09b03f5a4e6
draw-words-of-shape = Testo della forma
# en: 1737205dd1aad709dc2209b2e892ffb8c4de0fc8
draw-type-words-enter-is-done = Scrivi il testo. Enter conclude, Shift+Enter aggiunge una riga, Escape annulla.
# same
# en: a2f9d0d16d02a20ef369e6029d9e5929c3d70d3e
draw-xl = XL

# en: aba6eb7da15924b741fdff98ff19be9915cd84f1
draw-drag-to-move-corner-handle = Trascina per spostare. La maniglia d’angolo ridimensiona, quella rotonda ruota. Enter o un doppio tocco modifica il testo.
# en: 9cacab39109399036915a6b67336853e622472cd
draw-drawing-canvas-v-selects-r = Area di disegno. V seleziona; R, E, D, L, A, T disegnano; le frecce spostano di poco; [ e ] ruotano; Enter modifica il testo; Canc rimuove.
# en: 4421c5912fa5d727f23883b0a69028e195e3717b
draw-tap-shape-to-select-it = Tocca una forma per selezionarla, o trascina intorno a più forme. Scegli uno strumento per disegnare.
# en: 6f72f3cd1255e9bb344a1f9adb5fc64770f07cd5
draw-rotate-left = Ruota a sinistra
# en: b75f23d1d0e44603289911e22ad5efd66157913a
draw-rotate-right = Ruota a destra
# en: 4e41a56fa9e8996a27760c0b9c78c126b0892d19
draw-pixels-n-n = Pixel { $n }×{ $n }
# en: 6469ebd3a4fdb9e64f402eed612d2bfc0e0bf746
draw-align-center = Allinea: al centro
# en: b25d3dd496584e2c6258aa9c77cc555dfd5988a4
draw-align-left = Allinea: a sinistra
# en: e65f83bdf0bfbca6e0efd3f75baa155ab6652113
draw-align-right = Allinea: a destra

## the Animator

# en: a6b8b600c27ce95ddcf867cfc503564c89fe816a
anim-animation = animazione
# The templates: what each motion is, in a line.
# en: ec026663a7e4c23dd850c7f5a96deef71bf8bb81
anim-lift-off = Decollo
# en: 5d15aaf0784e98385ffc925f574edbf1a0657292
anim-rocket-climbs-away-with-its = Un razzo si allontana con la sua ombra mentre le parole salgono: due forme, due fotogrammi chiave ciascuna.
# en: 1cc22feeb4a82e33a9fd435fbf7c4a927a0408e1
anim-bouncing-ball = Palla che rimbalza
# en: 567b2c86aa06b4d0133474a39dc6545196754a25
anim-ball-falls-faster-and-faster = Una palla cade sempre più veloce verso il pavimento mentre l’ombra sotto cresce; avanti e indietro, rimbalza all’infinito.
# en: 7296aa4a483797a1a82ec05a4598688ca056cd36
anim-loading-spinner = Indicatore di caricamento
# en: ccf7f6eb9188fe228da413a1aaf39c5ee4994346
anim-eight-dots-in-ring-each = Otto punti in un cerchio, ognuno si gonfia a turno, così un punto luminoso corre in tondo mentre una pagina si salva.
# en: 691f884e182237907640c6964bda657a5ffec1c0
anim-title-card = Cartello del titolo
# en: 56d07df6f27b468d9e3456707110962e1da029c6
anim-red-curtains-part-on-opening = Le tende rosse si aprono la sera della prima e il nome del festival si fa avanti: riprodotta una volta, si ferma sul titolo.
# en: 1383ce3b8f642f2c5946975ca61e868e4a504819
anim-present-hops-stars-and-hearts = Un regalo saltella, stelle e cuori ondeggiano attorno, e gli auguri brillano in lettere arcobaleno.
# en: fad7f01d931894b10da998319cdc82f1a7d7e4dc
anim-quick-standup = Riunione lampo
# en: 79d688c0e9e1f3c402c3d6bedae252cfdd0b27aa
anim-meme-with-caption-above-and = Un meme con una didascalia sopra e una sotto, e un orologio che gira e oscilla nel mezzo.
# en: 7e9b34abf6e91127f94374508015ad795c91268b
anim-build-is-green = La build è verde
# en: 2015347d0927e36755702bf7ae8677fa8d565545
anim-meme-in-two-lines-of = Un meme in due righe di carattere Impact, e un trofeo che entra girando, atterra e si illumina.
# en: 98eb193445404588fd801a26b8383def925748ab
anim-flash-card = Flashcard
# en: 864aea3fc448ba5b87612d5e8c4c6dafde49b09a
anim-card-shows-spanish-word-turns = Una scheda mostra una parola in spagnolo, si gira per mostrare l’inglese, e si rigira: una rotazione attorno al suo asse verticale.
# en: 23015d1cbacca964e41f5cbb0021ed050964a9ed
anim-weather-this-week = Il meteo della settimana
# en: 8dc082991f9eea4f537ecd34d66858c28b08bcb6
anim-four-days-of-weather-in = Quattro giorni di meteo a Lisbona, ogni icona viva: il sole gira, la nuvola scivola, il fulmine guizza.
# en: b8224dd56d927c2c68b1498f39b7a2ed20f88c57
anim-new-year-countdown = Conto alla rovescia di Capodanno
# en: 6b46f602f1762ee9ef676cfb3d455fba6a9a07df
anim-three-two-one-second-each = Tre, due, uno, un secondo ciascuno, poi arriva il nuovo anno in lettere arcobaleno: riprodotta una volta, si ferma sugli auguri.
# en: e004a532912502de514d6c1801dcc60517d6007a
anim-flight-path = Rotta di volo
# en: 69049056a83981f31dea9f7350b7356570e735b3
anim-plane-crosses-dotted-route-from = Un aereo attraversa una rotta tratteggiata da New York a Lisbona, salendo mentre va, con gli orari del volo sopra.
# en: 7de4868fea7340b1b7e0779ba2e81218c703ab57
anim-neon-sign = Insegna al neon
# en: c0cba8072586f9c04d65da0f16b714c865f261e1
anim-cafes-sign-at-night-name = L’insegna di un bar di notte: il nome sfarfalla, gli orari risaltano sotto, e la tazza brilla e si gonfia.
# en: fadf71c7ea92e6416fd6d89969f8e78a115cd3c1
anim-sunrise = Alba
# en: 672c99d7a4f36fb3de226944eb862e3c9faa5663
anim-sun-comes-up-from-behind = Il sole sorge da dietro le colline e il mattino scivola dentro: profondità, dimensione e un profilo disegnato a penna.
# A key is a moment a shape is set at; between keys it travels. The effects (Impact … Blur) are meme looks.
# en: dc6828c6d02be5a4b4480bdf9e7f606c74b5ffd1
anim-animated-gif = GIF animata
# same
# en: c81fe6cce809d8d3f0bacf4a00e1c62251061d39
anim-video-webm = Video (WebM)
# en: e643c3f72a4f8b13abefb3c30793c8dbb2e124d4
anim-animated-svg = SVG animato
# en: 3b906156eac7b4b957d3a83ab79a3846fa2c900f
anim-empty-stage = Un palco vuoto
# same
# en: 64fe85d796d8c2eda594dbc0b7b3452a4a2c444b
anim-3d = 3D
# en: fe12532bd63a2e75713ec69be11e92d48e9db3c8
anim-add-key-here = Aggiungi fotogramma chiave
# en: 900aa998d3550d438fc20a414d3938fc3a1630ab
anim-blur = Sfocatura
# en: df0e298e356261439795d0d435ce0ce576604c65
anim-depth = Profondità
# en: 8f25a859269ca51039632dd6bba28fb061cfb8d4
anim-effects = Effetti
# en: b10a3addcfc5d7372c3a6101402e1f910da21188
anim-frame-n-s-s = Fotogramma { $n }, { $s } s
# same
# en: 62036a7016ec20273ff717698fbad321c4ff002b
anim-impact = Impact
# en: 4c0a5de85ac9512b6a503ba785c3f369b5cfbda2
anim-key-at-s-s = Fotogramma chiave a { $s } s
# en: 74adc5789ce92de7bbb5e3d84a287a1ce6d3e7f5
anim-mirror = Specchio
# en: a7b93d2128e820f861fc8dfccd9f5521e89ad21f
anim-mode = Modalità
# en: 987e5e1f455e03766d3ef3740947f4db46336d53
anim-moments = Fotogrammi chiave
# en: 76cdb950721642b6b8596d36d5a39f7705028b99
anim-move = Sposta
# same
# en: 00706b5e9ede7f2fb6145370efd20ef72969df11
anim-neon = Neon
# en: 781961bc81c25697841ecce5d4d9dad9f6b261c6
anim-pause = Pausa
# en: 5d12bd53552cafc41ca6146c04870df2e1574e13
anim-play = Riproduci
# en: fa968bd1155bd76231814d479bf070ed96cca9bb
anim-pixel-art-is-made-in = La pixel art si fa nel Disegno; l’Animatore muove le forme.
# en: b4a9395d25398654fd5d000e4b82a1d8273339bd
anim-rainbow = Arcobaleno
# en: 3d5096b70833fdae355f1ffcf32faf2066123467
anim-remove-this-key = Rimuovi fotogramma chiave
# en: aa0e7e86b7aa21e9851b9db8b752998918d2b608
anim-shadow = Ombra
# en: b7152342a267362add3c0d7f69f720f7a9c76c9e
common-size = Dimensione
# en: 4a6c11ab8104f8bcbb26155a8f68688d181f8a4b
anim-spin = Rotazione
# en: 598549d7818087a7d04d49a7b9c00979c8a35c96
anim-stage-alt-arrow-keys-move = Palco: { $alt }. I tasti freccia spostano la forma selezionata (o il tempo). Virgola e punto avanzano di un fotogramma. Spazio riproduce. K aggiunge un fotogramma chiave.
# en: a4277f79218220e03e7d4ebb5b1417cbdff137dc
anim-shapes-in-hand = Forme selezionate
# en: 6c82e6dd86807ee3db07e3c82bec1ae1ce00b08b
anim-time = Tempo
# en: 4ad8d1291a5b6b81cd03b1408570e1aae781c074
anim-wobble = Oscillazione
# en: ac906b0770d1cc5e8330907f0063ba444eb3cf5b
anim-now-s-of-all-s = { $now } s su { $all } s
# en: c7f73bb54d928922c3838bb789ee9fb8a5b1eb37
anim-settings = Impostazioni
# en: 89798935dfbced66a46a24ee534e23bbf5281faf
anim-this-frame = Fotogramma attuale
# en: cac09d8898c2435fb48b3b387ff152da7929eab8
anim-duplicate-this-frame = Duplica questo fotogramma
# en: 885c46b03eaf682f7c9534f7791ddfc3da84cd6f
anim-frame-earlier = Un fotogramma prima
# en: 2c3d7664e236cb8254795d8ffd3761741ccfff7d
anim-frame-later = Un fotogramma dopo
# en: bb4f3c806dbc9e6d5247da5b492939d83c90cf2b
anim-delete-this-frame = Elimina questo fotogramma
# en: 406ce96669c44a0f4b79e02af1464b6aa7fbf232
anim-draw-shapes-move-sets-them = Disegna le forme, poi usa Sposta per animarle.
# en: b4d477d39704ecbf21ca422aeebffbad5a519fbb
anim-nothing-here-yet-draw-something = Ancora niente qui: prima disegna qualcosa.
# en: 00f1eed948284854e29d59b2de928756b7f69388
anim-tap-shape-then-drag-it = Tocca una forma, poi trascinala dove deve andare.
# en: e4cabeb67c10b273fc4a1cfba538ac893c850f68
anim-drag-it-to-where-it = Trascinala dove deve andare a { $s } s.

# en: b0d1915925616cc03de525611bfe58839cf5fdff
anim-anything-from-drawing-tool-moving = Qualsiasi cosa del Disegno, in movimento: posizione, profondità, dimensione, rotazione e giro nel tempo, con effetti per i meme.
# en: 739720909d046c563acd15a980c916ae9b0a75f7
anim-back-and-forth = Avanti e indietro
# en: 7753216f948c789b0cbd5cfb16d1f50c1717383b
anim-forward-then-back = Avanti, poi indietro
# en: e3e7a3833d19706ebf33b2c3baf8e05deeed7bca
anim-frames = Fotogrammi
# en: 0d0b09dfb5d45add0e2f90ec8b193d96ace76d0c
anim-frames-second = Fotogrammi al secondo
# en: 3570d228949889218e4c7fdb4ad8c942753530a1
anim-how-large-shape-is-drawn = Quanto è grande la forma: 1× è come è stata disegnata.
# en: c028f533678015b6ac2e606a9cafef7e050b11aa
anim-length-speed-and-repeat = Durata, velocità e ripetizione
# en: 72f516ede84adba7283e1f7f5fd8eb787c7d33b0
anim-loop-forever = Ripeti per sempre
# en: 41b5b25a66d56fd91f645cbe6f83603567c3c480
anim-play-once = Riproduci una volta
# en: 368e8081b781aac177fd07c2415b694b1f878911
anim-turn = Giro
# en: b2343125992a36aa775f5740930f717a0d1a76d6
anim-turns-shape-about-its-upright = Fa girare la forma attorno al suo asse verticale, come una scheda: di taglio a 90°, a specchio oltre.
# en: dbe0717b0567202674ba26238e862ff18b3ffbbc
anim-turns-shape-around-in-plane = Fa girare la forma sul piano del palco, come una ruota.
# en: df7db1873937e8acd60c26ebf93191ad27b738e6
anim-which-shape-is-in-front = Quale forma sta davanti: una forma più vicina è disegnata sopra una più lontana, e una lontana un po’ più tenue. La profondità non cambia mai la dimensione.
# en: 2931befb0fbc6bdabcff5b420bf41435e4315548
anim-n-times = { $n } volte
# same
# en: 4a84fdfdafe66c2c85e3e7d7c434de987984470f
anim-s-s = { $s } s
# en: b78baea4121d1dfde75020adb28737da7ea84e59
anim-frame-back-frame-on = Fotogramma precedente o successivo
# en: ad3441e7c85b25bc4c7f46fd051345a6ba241e58
anim-nudge-shapes-in-hand-with = Sposta di poco le forme selezionate, o passa di un fotogramma
# en: fe13ca0956192777b5060b354cf8e5dc5553c328
anim-play-or-pause = Riproduci o metti in pausa
# en: d3b310dc90b3cc480984236a80101888836acfe9
anim-first-frame-last = Primo o ultimo fotogramma

## the Outliner

# The bullet is the line to the parent; a join between any two items is a connection. { $from } and { $to } are items' words.
# en: e8fb468f67bca1564ff499175d1b146c6ccd5d3a
outline-named-label = , con etichetta “{ $label }”
# en: 02d7116f49a426f4a9dba7a6582ae90478795f7d
outline-book = Un libro
# en: 8f9c05748f1616a4649174a8917da3ee5f3217e5
outline-decision = Una decisione
# en: c35876d5fcc88c6a4c142c7c0e391dda3f92ca08
common-talk = Un intervento
# en: 69d33e95f4f69c18d9591a8529f59a6703fc1f85
outline-empty-outline = Una scaletta vuota
# en: b972f73739624a697a0aa9bdde4289bafc5b6e4b
outline-outliner-ideas-under-ideas-folded = Una scaletta: idee sotto idee, chiuse e aperte, spostate e collegate; lo stesso albero che legge una presentazione o una mappa mentale.
# en: 3d47762769e98192ca611ea7fce028e70e16f174
outline-arrow-from-from-to-to = Freccia da { $from } a { $to }
# en: 081c7d75d7a6b1052f5643338773de8ea68de0dd
outline-arrows-both-ways = Frecce in entrambi i sensi
# en: 1e1c0cc8db067d827d10382e4329a748d2e3b54d
outline-as-page = Come pagina
# en: 16b6e0c696afc500fe76af1de5165a0563e80afc
common-calculator = Calcolatrice
# en: adab5090ac6a1b7b5420faac7be86c41721ba27c
common-calendar = Calendario
# en: ab732cac31bba434b0b59309a30ce46956dc3d54
outline-cancel-connecting = Annulla il collegamento
# en: 5301648dcf6b53cefc9ed52999aaa92d4603cae0
outline-change-it = Modifica
# en: 1ed0b58d18ef647be5de11840bb929ecc8e36446
common-chosen-items = Voci selezionate
# en: b65463cb6a42a17de514acc4659f7fd331e0876a
outline-connect = Collega
# en: f2ea879cf86d5519e3459e15ee70080a4a1306ab
outline-connect-from-words = Collega da “{ $words }”
# en: abfb16b3d00afef63f7ed53ad9ababbf2328b5d9
outline-connect-from-to-to = Collega “{ $from }” a “{ $to }”
# en: 378e916868a3e40a71abc67a748f7faacc94be85
outline-connection-from-from-to-to = Collegamento da { $from } a { $to }
# en: 8f3509b64e0ea82c53329cb49a7756bd1ced3566
common-connections = Collegamenti
# en: af74f7c5362aaee985bf8cda3dd75fc80751ce51
common-copy = Copia
# en: 153d7a58b3a3e898fcbdd04c462af308414bd09d
common-comment = Commenta
# en: 849e384559ff16cb2dcddb75cdf0a07437bcc3f9
common-open-this-change = Apri questa modifica
# en: ba97113463234ae7bc314eae6a172572b35b1b71
common-presentation-builder = Presentazioni
# en: 20dcb3b3184067197035f08a5a3955d51fcd94a3
common-diagram-maker = Diagrammi
# en: 0d84b3e5992959bf9adbeef94468228a5827605f
common-drag-to-move = Trascina per spostare
# en: 52db9dc3ff903f6d241a91adcbd83848467106c2
outline-draw-as-mind-map = Disegna come mappa mentale
# en: 03683dee41f9db7fad6f8d06c6c6bd776b528ba0
outline-draw-as-network = Disegna come rete
# en: c01d65d48941d40cf0e4bad6bc84c525d99421da
outline-draw-as-org-chart = Disegna come organigramma
# en: 3159fe421b3221381b3c778dc1c3c26e4540be37
outline-empty = Vuoto
# en: 4a66d1480779180159cc25c1c5aa9d760467c6a7
outline-everything = Tutto
# en: 9cf188d3a6779d63b36b10275b0228ae22ec97d6
outline-fold = Comprimi
# en: ec898362fe9593764e822dd17c78f1f972c20d90
outline-fold-all = Comprimi tutto
# en: ecdda59aea5ee67d7d854c969ccf7f4f4b4a4c54
outline-item = Voce
# en: 6f8c7dbc09548197b5d210f514dda19a015102b2
outline-item-n = Voce { $n }
# en: 120ee44bec923665b04dc825b0307fe159232ce9
outline-kind-of-line = Stile della linea
# en: 789062517bc27b8cb5c78b1e88041e5bef69b507
common-launch-plan = Piano di lancio
# en: 72eee0aaa10010ae7d362761115dfd7e064dd4d4
outline-line-from-from-to-to = Linea da { $from } a { $to }
# en: 2859ccc92143006360893c2a9cb1aaaa13b3928f
outline-line-named-label-change-it = Linea con etichetta “{ $label }”: modifica
# en: 52d55422c1936db72f18f5b9e960c2719a3560d7
common-animator = Animatore
# en: 260ff8ae7182fc851337b6b2fdb25f8cac2b8d47
common-move-down = Sposta giù
# en: 8a58f7b7ea514cbdf9bb23a231ad4d03f0cd0ca7
outline-move-this-item-drag-it = Sposta questa voce: trascinala su un’altra
# en: b4f57cd0cd5c7d88461c1718646713dea47a36c9
common-move-up = Sposta su
# en: 5b2d4bd98ab95d9eae0b3c956cbf98aefe9d7793
outline-name-of-line = Etichetta della linea
# en: 3aea913567c437a81d3c153ce49d321f64099651
outline-numbered = Numerata
# en: 89db2d16f087d4e687143e9a0071f77af473f9d8
outline-opml-for-outliners = OPML (per scalette)
# en: b22f39c9558f672318bf617175bf3daaa236c71f
common-open-in-new-tab = Apri in una nuova scheda
# en: cdd6290b6b2860663a3ff7c60cbe70af640e9c39
common-outline = Scaletta
# en: d7f6278b9a3a511b82633cbd63a4e86e91bab2d1
outline-outliner = Scaletta
# en: e57362d579b61ac9d08f5012ee0adf6fde22a855
outline-outline-lowercase = scaletta
# en: db2483000d154ca9fd74d41fc4e063a4b28faa87
common-paste = Incolla
# en: e45795fb6033ae4ecc1e2e3610273fce71a317d7
outline-plain-line = Linea semplice
# en: 9580fcbce0c31ceaa47eb583e5f7ce637fdc8a0a
outline-plain-text = Testo semplice
# en: 67ea25b11508ee37fa6c09bc9d3a1d6aa9a30f96
common-show-as-slides = Mostra come diapositive
# en: 59df6d7de818cdbeb08aa7f083aff96c1bccd1f5
outline-show-as-outline = Mostra come scaletta
# en: b306a7c32ba84dd4adea8612dccc99c15065eb53
outline-take-away-connection-from-from = Rimuovi il collegamento da { $from } a { $to }
# en: e963907dac5cd5c017869b4c96c18021c9bd058b
outline-take-it-away = Rimuovi
# The compound bullet (Paul, 2026-10-15): the statuses a document sets in its head, a status's pill, a due day's chip.
# en: e92aab82fce62899699581b5597abdda8175f2dd
outline-statuses = Stati
# en: bae7d5be70820ed56467bd9a63744e23b47bd711
outline-status = Stato
# en: c206561903295f2cf5944906fdfc55f1e8a5d45b
outline-no-status = Nessuno stato
# en: 1bcdd54c54c2bbd162c6353f5157804ce2270af5
outline-status-status-tap-for-next = { $status }. Tocca per cambiare lo stato
# en: 4c1aeebc433bcb8eb4b05434619ea3136b785ea8
outline-due-date = Scadenza
# en: bfe11361dd8dc7cc66f5cd6f33d394a95c71c96c
outline-due-date-ellipsis = Scadenza…
# en: 1cfca97d4ac1000c67f7b345992a5b58b3dac4b0
outline-due-date-change-it = Scadenza { $date }. Tocca per cambiare
# en: 6cf55f3558276e2eefff5dd41ec206dc9780bebf
outline-remove-due-date = Rimuovi la scadenza
# same
# en: 891e9d6d47f1bacfcba2dca1b282afcbcd25d94d
outline-agenda = Agenda
# en: aa73cdd3260a16a41d572c06ee0da42cb4b85286
outline-by-status = Per stato
# en: 0e719dcbe720c315d66c977072f10251b56bd994
outline-nothing-to-do-yet = Ancora niente da fare. Qui compaiono le voci con un’attività, uno stato o una scadenza.
# en: 064c87e25e9cca38db987bafd98c9fc9b3003456
outline-line-to-parent = Linea verso “{ $parent }”
# en: 99fec066e5bc2f5acc70261b4b5dd4b171fb491a
outline-arrow-to-parent-item = Freccia verso “{ $parent }”
# en: e37f9b066587aa06d9d2f6df504727599d9f5e4a
outline-arrow-from-parent-item = Freccia da “{ $parent }”
# en: 27228d1a3266064e49da7e3949d339b08473e294
outline-edit-statuses = Modifica stati…
# en: 70dfe3298343e43d0c29f07274084a4ce961dd7a
outline-add-status = Aggiungi uno stato
# en: 4f9beff18cc6852b012093ba97421788466bb3bf
outline-gray = Grigio
# en: 23376bab580fd3f3d521c66a65a03e7753da54cc
outline-last-status-means-done = L’ultimo stato significa fatto. Le attività con quello stato vengono spuntate.
# en: 7312a31a2c880f2d456663b6f91ad6da980b3a5e
outline-take-connection-away = Rimuovi il collegamento
# en: 656e5c87ae5cd391807e13c85fb32635c2d441c2
outline-tap-item-to-connect-from = Tocca la voce da cui collegare.
# en: 7a717eefe223e502e86655b5bf8eb999b867a9dc
outline-tap-item-to-connect-words = Tocca la voce a cui collegare “{ $words }”.
# en: 6ca2aebe7601f4f49f7f7df1ac23a0ac4a39abbc
outline-question-options-under-it-and = La domanda, le opzioni sotto, e per ognuna cosa parla a favore e cosa contro.
# en: da74cb6baba7a464fd8881af861a8c8d7952aff9
common-trip-planner = Viaggi
# en: 09ae5dce4d22019190e52d1611d1544becf36489
outline-twenty-minutes-in-three-parts = Venti minuti in tre parti: il problema, l’idea, cosa significa; una diapositiva per voce principale quando è mostrata come presentazione.
# en: 2af9d498f852995329b0033573277dce32d09ba0
outline-unfold-all = Espandi tutto
# en: f5857a77d395db75bc57c2c76b92dc8fa4773053
outline-unfold-n-inside = Espandi ({ $n ->
        [one] { $n } voce
        [many] { $n } di voci
       *[other] { $n } voci
    })
# en: 621521f9a8788695ec292cbec54d2792cfdf0a7d
common-untitled = Senza titolo
# en: 1e65f823e3600c2c4cec7aff6db37af296fca073
outline-view-as = Vedi come
# en: 828c360c884f9246750461eea43fee4e42c6b52c
outline-zoomed-in-on = Focalizzato su
# en: 38eca6735f66d186c0bd9c549873e774551dc35f
outline-a-plain-line = una linea semplice
# en: 884abd948f43aba4e5851b71a20e97aed7a6c96e
outline-arrow-from-parent = una freccia dal genitore
# en: b1efb9ef91ffdf7d42595fb81fb8b74184a5efbc
outline-arrow-to-parent = una freccia verso il genitore
# en: 54406ea0a263efcf4d3204fff2200f7f4d982c90
outline-arrows-both-ways-lowercase = frecce in entrambi i sensi
# en: 0048342aeabb8b2918689354650579bb2108a957
outline-e-g-owns-feeds-reports = per es. possiede, alimenta, risponde a
# en: e7292866259d82c2071011b0e5de8b80407998e7
outline-item-above = la voce sopra
# en: 973c239ffbd8d0522cea9cfa9e2664d2a96a2e01
outline-this-item = questa voce
# The templates: their names and blurbs (templates.md says what each is for).
# en: 5c3a8ec4fdc8ab96e7ef9f3a0739b0639c6ca926
outline-company = Un’azienda
# en: 8a7edf5c70300a3c146de3a15b534939e72226da
outline-decision-tree = Un albero decisionale
# en: c59b4e8c614eaaf02a0ac81499bc50947192118e
outline-family = Una famiglia
# en: 3ac1f9e665cb59f3a08ee0fba150dbbf4aab85a8
outline-five-minute-retirement-toast-opening = Un brindisi di cinque minuti per un pensionamento: un’apertura, tre storie, il brindisi, ogni parte con il suo tempo sulla riga.
# en: 9ed550a11b44d369413c1b004a5008d3c127a6c1
outline-novel = Un romanzo
# en: 35c9710d58daeb1aebb2143cfaeda278f0f67311
outline-product-launch-product-marketing-and = Il lancio di un prodotto: il prodotto, il marketing e l’assistenza sotto di esso, con collegamenti tra i rami.
# en: 79fd5c646ff9b077d10357db663c9b7d59acb64f
outline-research-plan = Un piano di ricerca
# en: 6a1ae380627dbc8fe79ff6a208c76b89d230979e
outline-speech = Un discorso
# en: f081caaa6b5cd7b0858a4a87cc6f81bdb215fd30
outline-syllabus = Un programma di corso
# en: 5b163ae0d9a3fd9b5ab6a8b6c27374091ceb25de
outline-ten-week-course-when-and = Un corso di dieci settimane: quando e dove, un argomento numerato a settimana, come si valuta, e cosa leggere.
# en: 9cea5f42a5742d9eef722836a7a7b59c6a5c0c5a
outline-thesis-two-arguments-with-their = Una tesi, due argomentazioni con le loro prove, l’obiezione e la risposta, e la via d’uscita.
# en: e5f2a2c3f76b55d5786f1c311773def62d6920f3
outline-essay-plan = Il piano di un saggio
# en: d926d538e1be8112e81292507985514feac5e4c4
outline-draw-as-family-tree = Disegna come albero genealogico
# en: bfef6f97dfb8178f726a96b8861bc2536e8c6fb4
outline-five-days-in-lisbon-packed = Cinque giorni a Lisbona, la valigia divisa per categoria, con cosa fare prima di uscire di casa.
# en: 987acdf86bb6a373c995aa374c004bb21bf2e576
outline-indoors-or-out-for-saturday = Al chiuso o all’aperto per un mercato del sabato: le risposte a ogni domanda sulle righe sotto, sì e no.
# en: 61390a6b5d7d9268827d91b4a818c6a5fbe2011c
outline-no-internet-at-home-question = Niente internet a casa: una domanda a ogni passo, sì o no, fino alla telefonata da fare.
# en: b431e4b41d5021ff680bdee33aebda8738cec5b0
outline-packing-list = Lista per la valigia
# en: 013532bb7e7d08afa22a3149f8e74b5ee4d9eaf5
outline-parts-and-chapters-of-book = Parti e capitoli di un libro di idee, con una riga sotto ogni capitolo su cosa sostiene.
# en: 5f646cfc8f40ae2515c9d774ae5ad523f524b998
outline-people-and-three-acts-of = I personaggi e tre atti di capitoli, ognuno con quello che vi accade, collegati dove un personaggio cambia il corso di un capitolo.
# en: dbb00953c7a1565bffce71190cfb90220362c471
outline-question-method-budget-that-adds = La domanda, il metodo, un budget che fa i conti da solo, una cronologia, i rischi e le letture.
# en: 57b065618d9af543d6fcc5085edd94aa723f8403
outline-three-generations-and-next-each = Tre generazioni e la successiva, ognuna con i suoi anni, disegnate come albero genealogico dal menu.
# en: 285ec850c11d78bac10f6bfa31b69a37f1b257c9
outline-troubleshooting = Risoluzione dei problemi
# en: c126bf3ee80a183d7c300cd69a01e39ab7dd8e53
outline-who-works-for-whom-at = Chi lavora per chi in una panetteria di nove persone, ognuno con il suo ruolo, disegnato come organigramma dal menu.
# en: 0c6266451117f0382231513e4c30d38fb976086e
outline-pdf-sections-and-bullets = PDF: sezioni ed elenchi
# en: 32897da2f696f1ddc73da9ef0575827530a80b1a
outline-fold-unfold = Comprimi o espandi
# en: 74341e3c271df3c784e595b804b1f90be0f80429
outline-name-line = Etichetta

## the Presentation Builder

# Its templates: the occasions and a second of each printed format.
# en: 44467d7b18daac8d8100b68ebc482fe0ee0ac9b6
deck-choirs-winter-concert-welcome-both = Il concerto invernale di un coro: il benvenuto, i due tempi, note sulla musica, i cantanti, e le parole per cantare insieme.
# en: a816093d69f08b81c457d818e6d1bd72e0915b10
deck-lesson = Una lezione
# en: e2d04797e440ee0933d032a29cfbfad5edbc99c7
deck-lost-pet-poster-in-red = Un manifesto rosso per un animale smarrito: il nome, com’è, dove è stato visto, un numero da chiamare.
# en: 4d44cafa1d032ca3ceda90fa9830717ea5cf8491
deck-morning-workshop-schedule-checklist-of = Un laboratorio del mattino: l’orario, una lista di cosa portare, i passi, e dove andare dopo.
# en: 7dc13283809d7ed9c506873aee1486fd988cfe5c
deck-pick-your-own-farm-what = Una fattoria dove raccogliere da sé: cosa cresce quando, come funziona, i prezzi, il fienile e come trovarlo.
# en: b822b42bfed453711aed6a262083b2a7aef5cd89
deck-pitch = Una presentazione per investitori
# en: a9964d2d4aae75e70e2e8dace25022b6679f25d7
deck-product-in-sentence-what-it = Un prodotto in una frase, cosa fa, i prezzi in una tabella, le date di lancio e il contatto per la stampa.
# en: a46e6eb74ae783d7eb35ae76afc5ab984683886f
deck-trivia-night-in-four-rounds = Una serata quiz in quattro round, una tabella dei punteggi e le risposte nell’ultima diapositiva.
# en: efebc637859160a6f694e66576eebb294de14712
deck-residents-meeting-about-new-playground = Una riunione dei residenti su un nuovo parco giochi: perché, cosa si propone, il budget a torta, quando, come dire la propria.
# en: 02e7a62fc65ed26cb0751706a5ea8f5783414eda
deck-science-lesson-on-chalkboard-aims = Una lezione di scienze alla lavagna: obiettivi, cosa sanno, il modello, una verifica, compiti; le note dell’insegnante sotto ognuna.
# en: f3a66c7b2a6ebda85ea74938fce4c397eae2a131
deck-seed-pitch-in-eight-slides = Una presentazione per investitori in otto diapositive: il problema, il prodotto, la trazione in un grafico, il business, il team, la richiesta.
# en: aab8da6eadee157bba3937e9dc00741cfe48b13f
deck-bike-shops-quarter-for-its = Il trimestre di un negozio di bici per i suoi soci: i ricavi in un grafico, successi e passi falsi, i numeri che contano, il prossimo trimestre.
# en: d0fa5e5696edaf949dfe9e739a7a2eef0d433ae2
deck-small-story-in-panels-about = Una piccola storia a vignette: prestare qualcosa a un vicino.
# en: 6c1ff81a2445a9eab1616588060b483cd5b6cde8
deck-twenty-minute-talk-with-speaker = Un intervento di venti minuti con note del relatore su ogni diapositiva, un grafico dei risultati, una nota e le lezioni imparate.
# en: 1a2fac58a0b80e771b6d2e526e7d3fee2cf6ef85
deck-badges-for-conference-each-with = Badge per una conferenza, ognuno con un ruolo e il luogo di provenienza, con l’aspetto Oceano.
# en: 7aa6a43fffd387b34fc7d06c7845de3f5bef745a
deck-comic-umbrella = Fumetto: l’ombrello
# en: 1796880ad702715de60aad7227c9bdca655f0fff
deck-concert-program = Programma del concerto
# en: 3843bc86872f81764fe670a10bd1192b5a78018c
deck-conference-badges = Badge della conferenza
# en: cae2fc32956e250bfadb1c6411ff593e325cf580
deck-conference-talk = Intervento a una conferenza
# en: 27fa527134938f2343573a9c4485c57bc7e6167e
deck-farm-brochure = Brochure della fattoria
# en: 6bd753630675cfdfe68c546580b14419bd8e80a4
deck-lost-cat-poster = Manifesto per un gatto smarrito
# en: dd7cf099a356a9e69908104ae2d8c2743ba41fb7
deck-product-launch = Lancio di un prodotto
# en: 68d708c4452b9eaca2d5d38e9d0a5848059fd138
deck-quarterly-review = Revisione trimestrale
# en: ca40a6181df561c65b71e9ebdf580ccae6b007b7
deck-recipe-zine = Fanzine di ricette
# en: 02bfd82260b75fe685e4e972cb9a3ae9b0a42f5f
deck-seven-soups-for-cold-week = Sette zuppe per una settimana fredda, una a pagina, in una fanzine piegata da un solo foglio.
# en: 44b5c7f041391d8b41a8ba365b6f13522877b478
deck-their-story-for-reception-from = La loro storia per il ricevimento, da come si sono conosciuti alla proposta, con una cronologia e un ringraziamento.
# en: 2aaeb944a6b05f452d512dc7dd5220adeee294ea
deck-town-hall-notice = Avviso comunale
# en: 14444c384d263fff25ba48b195abb55def791b75
deck-trivia-night = Serata quiz
# en: 0377beb012ed13e1986227ef8915aeab709ad5d9
deck-wedding-slideshow = Presentazione per un matrimonio
# en: f34f4184c545fd4fec60bbc441ead88d1f1fdd1b
deck-workshop-agenda = Programma di un laboratorio
# en: e4c8d951f1cc300d96873c7cfc850ad0f0ddaab4
deck-presentation-lowercase = presentazione
# en: 1e35470a39e5b3ddca4d3b585c9011db9b4c4dc6
deck-slides = Diapositive
# en: 5075541433d31fb8cf207ced97577686ac3fe961
deck-chosen-slides = Diapositive selezionate
# en: d7935967cfd3de8f11b33801800bece8d90cb55f
deck-move-this-slide-drag-it = Sposta questa diapositiva: trascinala su un’altra
# en: 19926fc5c47a7a39dd1435da06e3fc4c027458ea
deck-slides-titles-bullets-two-columns = Diapositive: titoli, elenchi, due colonne, grandi icone, altri documenti su una diapositiva; oppure una fanzine, un libretto, una brochure, un fumetto, un manifesto o dei badge da stampare e piegare.

# The layouts, the transitions, the formats
# en: 7509c5747e5db3dfa3373afc42eca9f5b27a8599
deck-bullets = Elenco
# en: 8d8f0f25822179c33b917613ec2d022ef593c340
deck-two-columns = Due colonne
# en: 1d6bece457daf37f906239468dadfdfb619adb98
deck-big-icon = Icona grande
# en: 5298d08bb7ae7d01f4efcdbb94ff03fc487fd11c
deck-fade = Dissolvenza
# en: 38d13bda5c40afc32d629f81dec6c156cbea328e
deck-cut = Stacco
# en: 38d13bda5c40afc32d629f81dec6c156cbea328e
common-cut = Taglia
# en: a5d5b46a7720824b51da4be0af97f5cfd1168cd0
deck-slide = Scorrimento
# same
# en: 9b3cbed5c490c07473546a88768ba29b787e9e52
deck-zoom = Zoom
# en: d4ff278598ebbd3f36cecf27e68c66de49d2f62f
deck-zine = Fanzine
# en: 8ef5c45547ec6440e6dde4870e3f92d6c08dfbaf
deck-booklet = Libretto
# same
# en: 80dceb58c1f9daca0ebaa066d80e670cfdf1123e
deck-brochure = Brochure
# en: 5549c5222b1b1eb52e37ae3542dcc0f7cb9fd376
deck-comic = Fumetto
# en: a33539ca77a6c42fd7a1e50aef1516b3a87d7c85
deck-poster = Manifesto
# en: be13a787e958beeb3139d8e1b3ebc2b879732db2
deck-name-badges = Badge

# The themes (the Look menu) and the icon colors
# en: 34118050b206b7ee3e5bcb8e4adbe8c17630020d
deck-plain = Semplice
# en: b6369ed60eb9bda1aa642868ddfb5053547f0206
deck-boardroom = Sala riunioni
# en: 39973be20679a94e4c998a58c0f6c76daaf6cd11
deck-ivory = Avorio
# en: 558287ddcc3557b09ec00ca17b3e4be7e6645858
deck-midnight = Mezzanotte
# en: 220c98deb1482e5b5361b123b929ee8e4ac1e18d
deck-graphite = Grafite
# en: 79141e063e10bb80a7b799878f12312eb89fbafd
deck-confetti = Coriandoli
# en: 181bcd5760fd32163554c899301a30b2cd381cf4
deck-sunset = Tramonto
# en: 76022a00a16b0482beec04274945ed192a931410
deck-ocean = Oceano
# en: 07a59415416c4f5915d5efbe6319ca69450f0a77
deck-bubblegum = Chewing gum
# en: bc727a101b60bbc2b4f96365ecf1ee4bd1db685a
deck-arcade = Sala giochi
# en: 5efe442a0ed9b1e51ec7e85696d66d6ac3db83a8
deck-chalkboard = Lavagna
# en: 5f941ab65fbabe87f41cd73c9136f5a4c97087e8
deck-fun = Allegro
# en: 0bd48966c3fe51c025c34a472af7fac64b2292dc
deck-themes-color = Il colore del tema

# The bar
# en: 4e9f7a31eef4c69e0aacb643f6856372cd6e3247
common-present = Presenta
# en: 3c47e73f6a8bcb018bdbe91d9312e8e1777050f7
deck-see-sheets-to-print = Layout di stampa
# en: ca742a9ecf2f35a59704398ead009f1d8e554a0c
deck-back-to-pages = Torna alle pagine
# en: 442250df38e5e516ff1c2ce97d051b8997c7d976
deck-headline = Titolo grande
# same
# en: 1cd715cdb2322da76e4ce7f490064782c83337b2
deck-layout-layout = Layout: { $layout }
# en: e85e5488b4184d6cfb4c0aa36e169a271068ec0f
common-look-theme = Aspetto: { $theme }
# en: 896afdc59964bf4da2b261b6056d23286d186427
deck-transition-transition = Transizione: { $transition }
# en: 438dcf262325319835f0d0aefa8a4ecddaf49a16
deck-format-format = Formato: { $format }
# en: f16eadab2a72ff13044cc806dbcf2c117b32244f
deck-printing = Stampa
# en: d5939283a7a53a72f09e4f327bc22f2872b64257
deck-one-sided = Solo fronte
# en: 256dd8b8869a6c72f553a2905aef393f2b39df0d
deck-fold-and-cut = Piega e taglia
# en: 8cb849ee6e612fbad8641d053d8e66b2ba560a1b
deck-two-sided = Fronte e retro
# en: b82a2c3204554a9c0a82b44aa7eb5f94916b1c13
deck-cut-and-nest = Taglia e impila
# en: 6e19d7b7deffd2974f632ec3e697646de978130e
deck-end-with-qr-code-of = Finisci con un codice QR di questa presentazione
# en: 0c7dca360d478b76246b0ddf594aed2299af3ef2
deck-move-slide-up = Sposta la diapositiva su
# en: 8e87a8ca3749be93e307f172d62814c1b58865b4
deck-move-slide-down = Sposta la diapositiva giù
# en: 3a260e90c0d893d60ed227c10bfade84b5a2adef
deck-delete-slide = Elimina la diapositiva
# en: e984a8f80b4d34ad2ca73e2a3a432a6a08a6db27
deck-move-page-up = Sposta la pagina su
# en: 21c3799bf3525e9642bab926aa4f81f07a5d8a0f
deck-move-page-down = Sposta la pagina giù
# en: 260b69625056e26e4029491cf672306054bf10a6
deck-delete-page = Elimina la pagina

# Insert
# en: fffd75e48f61364f8486681ac4213184abd2373f
deck-bullets-slide = Diapositiva con elenco
# en: 6e281f49affc0fc305e572fc6d08a6ca82a597a1
deck-title-slide = Diapositiva titolo
# en: 8401be1cb1b1122b954639aeea6e348e2c709b23
deck-two-column-slide = Diapositiva a due colonne
# en: ecca8f3f7107aaa37ae2674734c101faac7e3e11
deck-big-icon-slide = Diapositiva con icona grande
# en: fb06270f7c212baabc8749ffc36e49dc8f321548
deck-page = Pagina
# en: 31f820710f9d6c3e03e8b9e5996902c45a8816da
deck-title-page = Pagina titolo
# en: 9b0d34e9841a2c5fa15e4c9e68c01f338dc34930
deck-two-column-page = Pagina a due colonne
# en: cfdc49e689f75ddfc0372d83f7c9a396b6616dd8
deck-big-icon-page = Pagina con icona grande
# en: 17a4bbb4cefcb0a1fccf38f1c561b2a18fe44456
deck-four-more-pages = Altre quattro pagine
# en: a59879f8796236335931a0b95f1cb1a1db39e210
deck-on-slide = Sulla diapositiva
# en: 9bab04556dc2a912d86a00f7b4dcd7c540468b8b
deck-on-page = Sulla pagina
# en: 600584c2d5ccb97c0c0c424d9f32d6b102fcb040
common-pages = Pagine

# The canvas
# en: 028137d1d6f1cf21777ce8a83b467b80e04a6168
deck-add-icon = Aggiungi un’icona
# en: f68895d5ec9c6f1865e9ee69f1d423cbfd251599
common-change-icon = Cambia l’icona
# en: fd8de0a92eedac5ccdf6c587b3ae177b97da0ae0
deck-pick-icon = Scegli un’icona
# en: 3805391efb1ea53cff43e62a0dc134be9b14bd8d
deck-left-column = Colonna sinistra
# en: e8965b7c19d1ad62de75e624088e40b37d16f206
deck-right-column = Colonna destra
# en: 58952208e1b00c3e046eab00b1e20bb448262df9
deck-one-bullet-line = Un punto elenco per riga.
# en: a32090c9358d8e112f4074c11a76811a50d53d5c
deck-one-bullet-line-tab-steps = Un punto elenco per riga. Tab aumenta il rientro.
# en: f8948a4a523b4312c5567f9cff1f6788c757998f
deck-line-or-two-under-title = Una riga o due sotto il titolo
# en: 236bcf1c6a83d3b0f85a065c777d7948b22a0c22
deck-what-this-page-says-type = Testo della pagina. Si rimpicciolisce per stare nella pagina.
# en: e80e281dac24d9c4c3f60dcdbf8700e9603b825e
deck-panel-line-what-is-said = Un riquadro per riga: cosa si dice | la didascalia. Icona gli dà un’immagine.
# en: 3d6e76c9325034deb76b92c8cc47a2d3c22fcdf3
deck-speaker-notes = Note del relatore
# en: f0ea152b4f68c54e5bc3476bae70301bc7fb2523
deck-n-total = { $n } / { $total }
# en: 3b73ff036c4ba5dc509f9a2e55189b33fc8013bb
deck-document-on-slide = Un documento sulla diapositiva
# en: 800ddde9b84d77765694212f6af1a9ed4329c77c
deck-remove-from-slide = Togli dalla diapositiva

# The rail and the sheets
# en: 7e4475e68efd3a93e2aa3ad794afd9388b4c89d1
deck-slide-n = Diapositiva { $n }
# en: 5f78f871f6b48ae876a1dbe89a5b8bff6f6b9849
deck-front-cover = Copertina
# en: 95842f717432a63230077bc5ea48addf5bc52947
deck-back-cover = Quarta di copertina
# en: 10e4725d5544e065501162abcf8a53b94451df0c
common-page-n = Pagina { $n }
# en: dd19f9887573a9f06294de48329bfb1b3a5ad273
deck-front = Fronte
# en: 6f453fd2a404a86955b0f23219d84f2bcb4e7d06
deck-inside-left = Interno sinistro
# en: 4fe87c5667532867fc721531b92a7ca6b391eb8a
deck-inside-middle = Interno centrale
# en: 3e654f345b202e7b158b2c61ff91fe55b0d3d46d
deck-inside-right = Interno destro
# en: 418bf9a5530258c65b3dbc1f932667dafa01469c
deck-inside-flap = Aletta interna
# en: b52b36b7269fbfc58ec24bb724691951a3decbe8
deck-back = Retro
# same
# en: 3369aa225b34e01144a4c49dd350db04732a2720
deck-badge-n = Badge { $n }
# en: 9cc25309d07de0adfb989faaaaa74f7cb5a06e38
deck-last-slide-added-for-you = Ultima diapositiva: un codice QR di questa presentazione
# en: 03c90c8e6a7e028c2e9caeadc1961fb5c0ad4e57
deck-ends-with-qr-code-of = La presentazione termina con un codice QR, così il pubblico può portarla con sé. Il pulsante QR lo disattiva.
# en: 13c7cb226b093919972f5e423aeb0abae93960cf
deck-qr-code-of-this-deck = Codice QR di questa presentazione
# en: 5d5bc5601280c776405941347bbf7e9c63dc3954
deck-sheet-side-n = Foglio, lato { $n }
# en: 1982f74c2102a55783a4774ddd4895dc7fec26f0
deck-cut-along-dashes-this-half = taglia lungo i trattini · questa metà va fuori
# en: 0fc0c2932d66df46e1af55ac50d98be2bccd63c3
deck-print-on-back-flipped-on = stampa sul retro, girando sul lato lungo
# en: e0226944c5e9e4df97a3bf718ac488a8a51118fa
deck-cut-along-dashes-fold-along = taglia lungo i trattini · piega lungo i puntini
# en: b0ccda7ec0d37c14d00e5e9f57eeadcb1045ebd7
deck-print-it-double-sided-on = Stampala fronte e retro su carta Letter, girando sul lato lungo, a dimensione reale. Taglia lungo i trattini, metti la metà alta sopra la metà bassa, e piegale insieme a metà.
# en: 7d7f71d31c8968c0555f49f9430133796d626c4f
deck-print-it-on-one-side = Stampala su un solo lato di carta Letter, a dimensione reale. Piegala a metà nel senso della lunghezza, poi in quattro; taglia lungo i trattini al centro; spingi insieme le estremità e piegala a libro.
# en: ce30358159a7953f092af19e48f7dad47608c83d
deck-print-it-double-sided-on-letter-paper-flipping-on-short-edge-at-actual-size-stack-sheets-in-order-first-on-outside-and-fold-them-together-down-middle = Stampala fronte e retro su carta Letter, girando sul lato corto, a dimensione reale. Impila i fogli in ordine, il primo all’esterno, e piegali insieme a metà.
# en: 96bf1a2ba3e6d649669efc225b3104521735ff25
deck-print-it-double-sided-on-letter-paper-flipping-on-short-edge-at-actual-size-fold-right-third-in-then-left-third-over-it-front-is-on-top = Stampala fronte e retro su carta Letter, girando sul lato corto, a dimensione reale. Piega il terzo destro verso l’interno, poi il terzo sinistro sopra: il fronte sta in cima.
# en: 6d4cc8d4405840522000283a7e419c1c93e89392
deck-print-it-on-letter-paper = Stampala su carta Letter, a dimensione reale.
# en: f81a8cbfa80cae20e64c2c1dd92fec6cfefba6c9
deck-print-it-on-letter-paper-at-actual-size-cut-along-dashes-six-badges-sheet = Stampala su carta Letter, a dimensione reale. Taglia lungo i trattini: sei badge a foglio.

# Presenting, and the closing slide
# en: 6e875951a6f9aa1374d93572de657c12ded57355
deck-presentation = Presentazione
# en: 50f94286ba30706a19070d3ec0a0c8d34d6cf6eb
common-previous = Precedente
# en: bc981983e7f547dc62e19a1e383acfe00782a6d5
common-next = Successiva
# en: 10225bffa1614015caa499978578b424eb0ee56f
common-stop-presenting = Smetti di presentare
# en: 1380030776f8bb0e462fd6e828a563e49da50652
deck-slide-n-of-total = Diapositiva { $n } di { $total }
# en: 70440046a3dc2e079f23ee1c57dfa76669b732aa
common-notes = Note
# en: bd0dad7cbf71b13b2e545d8ce477027ffc106b45
deck-n-hides-them = N le nasconde
# en: 45c44dc2566819f835fd788e2b7a6c5bee5177c4
deck-take-this-deck-home = Porta con te questa presentazione
# en: acc1edc431e346786fab17d4f10e195ca72257d6
deck-take-this-deck-home-title = Porta con te questa presentazione: { $title }
# en: 7fc2d8c7fd4164039149b5a9f2063ddf7ab9d76a
deck-scan-code-whole-deck-is = Inquadra il codice: tutta la presentazione è nel link.
# en: a0f82f698bc01f5dc90c760db684589e2d8277eb
deck-a-qr-code-of-this-deck = Un codice QR di questa presentazione

# Downloads
# same
# en: a149055ecee5f95be2951f0b5454f3d1ef47c786
deck-powerpoint-pptx = PowerPoint (PPTX)
# en: 7660a22bdc9507edd353dd61198b9aa86488d936
deck-picture-of-every-slide-zip = Un’immagine di ogni diapositiva (ZIP di PNG)
# en: 98a41f54e049532b6032b88d7656348adc178c2a
deck-animation-of-deck-gif = Un’animazione della presentazione (GIF)
# en: 3bab526d831e1024e6f8e7d197f9c3d72cc4f0e4
deck-film-of-deck-webm = Un filmato della presentazione (WebM)

# The templates
# en: e5604bc465a212ad3d7f4e13ed282f030d9d3a6b
deck-title-agenda-three-points-with = Titolo, programma, tre punti con note per chi parla, e una chiusura.
# en: 60c974074604818e661eff7940285669d1496647
deck-status-update = Stato dei lavori
# en: 34714be3698c31c72afb1d4d4b8a7b0c69f30fc5
deck-done-and-next-side-by = Cosa è fatto e cosa viene dopo, affiancati, poi i rischi, poi le richieste.
# en: e946db45d2689df95cbac9f8137664409c51f5d8
deck-proposal = Una proposta
# en: 52ab7599cc26432ef9b492b401d04eee1ca5e699
deck-what-you-heard-what-you = Cosa ti hanno detto, cosa proponi, quando, quanto costa.
# en: b8e1f28fed63f996c8915470a7ee9ce8aef9b75f
deck-eight-small-pages-from-one = Otto piccole pagine da un solo foglio: stampa, piega e taglia, oppure sfogliala sul telefono.
# en: 31b11edde49cd1bd80a198f240426c5b2d8cd65f
deck-booklet-of-half-letter-pages = Un libretto di pagine mezza Letter, da otto a venti, impaginato per stampare, impilare e piegare.
# en: ae07389f7b537dbd7eb3007d3f2b36ca3c35c404
deck-trifold-brochure-six-panels-on = Una brochure a tre ante: sei pannelli sui due lati di un foglio, ognuno al suo posto per la piega.
# en: 88c71dbca35b2e7c498adce21174cb1102af384e
deck-mini-comic-panels-with-picture = Un mini fumetto: vignette con un’immagine, una nuvoletta e una didascalia, piegato da un solo foglio.
# en: e610bb7f6eac1dd5622723ccc779e31e9d9ed190
deck-poster-or-flyer-headline-and = Un manifesto o volantino: un titolo e poche righe, grande quanto permette una pagina.
# en: ec024ffdc152af00e77f7219a5293545bdd3bb65
deck-name-badges-for-meetup-one = Badge per un incontro, una pagina a persona, sei per foglio, pronti da tagliare.
# en: 9a51ba7142888f3e0199896de291a1fb4b4298f1
deck-edit-this-deck = Modifica questa presentazione
# en: d5947c525ed0d53dce794385a2cc1cd6e2459dbd
deck-new-slide = Una nuova diapositiva
# en: 720856fcb53d62f79a364c36d8cd2314121430a6
deck-presenting-back = Indietro (in presentazione)
# en: a212c73bb85a53b57609d239c50f170773e07d77
deck-presenting-next-line-or-slide = Riga o diapositiva successiva (in presentazione)
# en: e53a09169fa399b79b5b814de5e65669714f9165
deck-presenting-whole-slide = Diapositiva intera (in presentazione)
# en: 7722768d8b861ddedb1f6400352985ca0cfd4a08
deck-slide-before-slide-after-on = Diapositiva precedente o successiva

## the Calendar app

# en: e4ffacba5591440a14a08eac7aade57c603e17c0
cal-calendar = calendario
# A span is an event on the calendar or a task on the schedule (the Gantt view); { $every } is "Every week" and the like.
# en: 11fcad4bfe2782393e5d2ac5e04d65349890ea94
cal-name-yours-say = Un nome (il tuo, per esempio)
# en: e288d42e3bba2f9fc3b7f2287d2ea4f141e72236
cal-schedule-phases-with-their-tasks = Un programma: fasi con le loro attività sotto, a che punto è ognuna, il lancio in fondo.
# en: f0424f3e15f33d07de80ddfd02a4b56f047767d7
cal-week-earlier = Una settimana prima
# en: 5e63d8681fdc3170ed99fc3abcc3668620f299ca
cal-week-later = Una settimana dopo
# en: ab455a2fb151da1c7d0c39c7534c2f935e028ce9
cal-weekend-of-sessions-at-set = Un fine settimana di sessioni a orari fissi, con un set dopo mezzanotte.
# en: 114574336ac7883aebd0653b3fc5e82f9262dc86
cal-all-day = Tutto il giorno
# en: cbf28df446643f9968f7fe68968bca51be5cf792
cal-chart-scrolls-sideways = Grafico (scorre in orizzontale)
# en: a13d5b9d3da48c8bade3d645e0de9a9bb812c648
cal-color-for-new-color = Colore per i nuovi: { $color }
# en: f6bb0f468a8569c67b3d6826e57e62c5500c3681
cal-days = Giorni
# en: b50e483c45f8f17795b63f822127ff0171086900
cal-days-and-times-on-month = Giorni e orari su un mese, un anno o un programma, in qualsiasi fuso orario.
# en: 9ccd3e7bb11493f1e93950f7db9148a4794037b7
cal-done = Completato %
# en: a7028454f240815938eaf701823b7d55dbaf98a9
cal-edit-event = Modifica l’evento
# en: 8a4d4e6eb9a367d616b8a4cbfa2792068482e884
cal-edit-task = Modifica l’attività
# en: 99570f85bb2bae0dbe3e8f2f3d6d6f765ee7c47e
cal-choose-task = Seleziona { $task }
# en: 72b4644a41881ce4e156ce3283119c74f598cbea
cal-day-earlier = Un giorno prima
# en: 8d6915ee723c8b3c01f29002cfed7d597d56c2c7
cal-day-later = Un giorno dopo
# en: 66a755ea0d935aeac763da63deebb69b0eb54ba9
cal-dates = Modifica date…
# en: a2bb9d34b8a1a79665858d354585cf147e0dee4e
cal-end = Fine
# en: 89d10cd6c1e1437d6318d6fbb25a40e0aaaddd34
cal-end-date = Data di fine
# en: cd7800da7f4ff94a0e14445d7f94b6345d1b7b8a
cal-end-time = Ora di fine
# en: 91856dcb7d93f9c6725649160ab6abe379d8e5c9
cal-ends = Finisce
# en: ad8919ace091b14011c6439cfd5e1707b58f5abd
common-event = Evento
# en: 3b2eb5131055ad07ac1d08de2f11f900286a51b5
cal-every-day = Ogni giorno
# en: 7f3932f9cb96cb99072771c992c0ce3c0b342bfb
cal-every-month = Ogni mese
# en: 043058e2050c0345ef7aac78bd9025d3adce099a
cal-every-week = Ogni settimana
# en: cea537cd72239840db0466ba29562d222299f7ce
cal-every-year = Ogni anno
# en: 557ea666ac9eafe1543ea9c4423073c8be815d79
cal-family-calendar = Calendario di famiglia
# en: 05061b43a7c1a210598d8a217347a96fdb45df8d
cal-festival-weekend = Fine settimana del festival
# en: a3f5851f7cb29b64859b01ec6429ea85811bb192
cal-how-many-times = Quante volte
# same
# en: 834c5ef85d6fd469b8be75d8685faf6f9e84eaa7
cal-icalendar-ics = iCalendar (ICS)
# en: 4bcc328bf3b5b886738db678a175936615491289
cal-its-own-zone = Fuso orario del calendario
# en: 2a177256a408fa4fc557b301041589b798826d70
cal-last-day = Ultimo giorno
# en: 58ef633830b461aa76bf4ee90e3b2831ff588508
cal-lessons-birthdays-and-holidays-color = Lezioni, compleanni e feste, un colore per ogni persona, le cose settimanali che si ripetono.
# en: 7c7f5d049fad2569721d446c4a811f9bd5da5393
cal-level = Livello
# en: 082bc378cd60e17a38d99898b21955299c5b60c8
cal-month = Mese
# en: 770d509550265dba792aa81868b856eb67225e41
cal-my-zone = Il mio fuso orario
# en: 80c3052d33ccdee15ffaaa110c5c39072495fe63
cal-never = Mai
# en: 2ef3795c979293106a6ccf13359d732165fb660a
cal-new-event = Nuovo evento
# en: 25d3553217b2058be97b5339fbe6a576cfeb6856
cal-new-event-on-day = Nuovo evento il { $day }
# en: 17b2b838c5ce22c961a36736534a5029d6ba0087
cal-new-task = Nuova attività
# en: 8abf7cf1d0b36ff16ebbe26b8285a65d9d1582f6
cal-next-month = Mese successivo
# en: 22c6f667e4103029954aa28d43a1d4888122b35f
cal-next-year = Anno successivo
# en: 1562a21cadb04e59b670cb3e32fb54f1777db699
cal-no-tasks-yet = Ancora nessuna attività
# en: 3b2069a4f745374e50f8992752888822ce851db4
cal-no-tasks-yet-insert-task = Ancora nessuna attività. Inserisci un’attività.
# en: 855dec4a50f5117b51b7f32b59771f28855942ac
cal-nothing-on-calendar-yet-tap = Ancora niente nel calendario. Tocca un giorno, o trascina su più giorni.
# en: 27d7bd5f744f76fc1ad85bbe975e9fdca473eaeb
cal-nothing-this-month = Niente questo mese.
# en: 46a299215300b3a0de6931f926bc6b0f2283eb99
cal-previous-month = Mese precedente
# en: 2f866c70871d37f90c24fefa28d87cc19d8850c3
cal-previous-year = Anno precedente
# en: 580110a84277d369b216be5a01a5ba50868d4d3f
cal-project-plan = Piano di progetto
# en: 6ae5ee3e66205a8b1a41c80c4db0dcc982e50f44
cal-repeats = Si ripete
# en: 0a8adac9d6d5f4d14ee887d196cd8618f0f3391a
cal-schedule = Programma
# en: e7fe53f0503eb82f8c80f9b233fa566339a9f9e8
cal-show-times-in = Mostra gli orari in
# en: 952f375412e89ff213a8aca383d18e5691354347
cal-start = Inizio
# en: ff99f5b5f7948dfa71fd545b3d99f5f00856ea29
cal-start-date = Data di inizio
# en: 88d8206d586abe4c8e35c8e9adcc649d07c99a1e
cal-start-time = Ora di inizio
# en: fc612a2fcc722bde9d98ae18bea42764812b6784
cal-starts = Inizia
# en: 0e648419ea806b0cc4db81617f95870a094f3639
cal-stops = Termina
# en: 480b9be2834a2278919632171f788a9a80d5d743
cal-same-dates-as-gantt-chart = Le stesse date come diagramma di Gantt
# en: 7ea6dec71584012ab4044cc464dc601741ff2c50
cal-this-calendar-is-written-in = Questo calendario usa il fuso orario { $zone }.
# en: e10c10f818ac8e510b74062cde201eae4e8d8c66
cal-this-calendar-names-no-time = Questo calendario non ha un fuso orario, quindi gli orari sono mostrati nel tuo ({ $zone }).
# en: 1b4785331db3b08cd8e3cfa4bd36216731a79e54
cal-this-month = Questo mese
# en: eea79afd832854a3b24153b928ee9c62c7457dbe
cal-time-zone = Fuso orario
# en: bf5efde33adface92f37d1888e904ab70c9ce272
cal-times-in-zone = Orari in { $zone }
# en: 650642b1d6b4b1ecc4ad7d38bbdf110d582c4baf
cal-times-or-on = volte, oppure fino al
# en: 69bd4ef9fbd0894a22759c3766b859defbdedbc8
cal-view = Vista
# en: 97211a8888128314d9ca34d1005f08cb83ed5d9c
cal-what = Cosa
# en: 879e32326c5217968ac8e3a14e4a8a5214957264
cal-year = Anno
# en: 6189fbfe149a418e2f6d1af4dd71b04f6aa0c50e
cal-color-stands-for = { $color } significa
# en: 63e5df0eb2fcd351c1d31f23cdf3bf4816e3def5
cal-every-until-date = { $every } fino al { $date }
# en: 519c383aaa892cfff62e992bb947ec79ed5dd57d
cal-every-n-times = { $every }, { $n } volte
# en: d69842d42eceddee8c62019d22d4f7ca383cf847
cal-n-days = { $n ->
        [one] un giorno
        [many] { $n } giorni
       *[other] { $n } giorni
    }
# en: 0cf851711322b556de4e3e932cdf083d7444c723
cal-n-done = { $n }% completato
# The templates: each name, then its line on the home page.
# en: 71428a822d08efae1d13babd6073592abec99d1f
cal-bakerys-posts-and-newsletters-through = I post e le newsletter di una panetteria per tutto l’inverno, una storia d’Avvento ogni giorno.
# en: 91dad831b9be334af672cd6052e37dedde16d06e
cal-youth-soccer-season-practice-every = Una stagione di calcio giovanile: allenamento ogni settimana, in casa e in trasferta con i loro colori, i playoff.
# en: d7bad656f3b06c3ee989a1f2960214ee15b2f788
cal-small-teams-time-off-public = Le ferie di un piccolo team, i giorni festivi e la chiusura di Natale in un solo calendario.
# en: cd6036648af6d0d5614f0ec65eb732300281e059
cal-community-garden-plots-year-when = L’anno di un orto comunitario: quando seminare, piantare, raccogliere e potare, ogni anno di nuovo.
# en: 1b04e3c7d585a3d6297852d158919c9833538a01
cal-fall-term-from-first-day = Un trimestre autunnale dal primo giorno a Natale: chiusure, club, la gita, i colloqui con i genitori.
# en: f80b28faa22109c4d14cf7eb7994768abca09ca8
cal-bills-and-renewals = Bollette e rinnovi
# en: 2223281ed9222907f9d00ef35ab71df263d06e46
cal-conference-agenda = Programma di una conferenza
# en: 87695adec8581b20111f35794592bb162c32e800
cal-content-schedule = Programma dei contenuti
# en: 072b8e4f3e23cdd58cf0a4b3f5c47437127f131b
cal-editorial-calendar = Calendario editoriale
# en: 26f861d8db0e97575e814ce9799eaf1bcddec28b
cal-every-autopay-on-its-day = Ogni addebito automatico nel suo giorno del mese, i rinnovi annuali e le scadenze fiscali.
# en: 2185215436152ae5c1d9429385551e46587c7af8
cal-garden-calendar = Calendario del giardino
# en: 624b49bb82a8487f3ff77d2098b88b1e1ceb6695
cal-vacation-planner = Piano delle vacanze
# en: 1ceb786961989ab69eda934e08645ecb19fe5357
cal-league-schedule = Calendario del campionato
# en: 5a94fcfb3e67abfdd4e3bab4c3d9a2683801245a
cal-school-term = Periodo scolastico
# en: 2f88af7308e60cbfbe5482a13acec0983b020e09
cal-training-plan = Piano di allenamento
# en: 5ef83b6b17b42f15d49c31f33e46ca8d4427e6ae
cal-twelve-weeks-to-half-marathon = Dodici settimane verso una mezza maratona, come programma: base, costruzione, picco, scarico, gara.
# en: fdab2603fde2488e117cca6335baee3c481231b9
cal-two-days-of-talks-and = Due giorni di interventi e laboratori ora per ora, un colore per ogni sala.
# en: c8bbdc31a9be182914dd6207c08837389224b33a
cal-two-issues-of-quarterly-from = Due numeri di un trimestrale dai testi all’edicola, la riunione mensile e il lancio.
# en: 0e4753002a6b042b841f5296f0cdb7c71110377b
cal-volunteer-schedule = Turni dei volontari
# en: f6003458ea2ce51dfa0efa7d0819ccb57ac35bd1
cal-who-does-which-shift-color = Chi fa quale turno, un colore per ogni persona, in un banco alimentare prima di Natale.

## the Diagram Maker

# en: 8737093597f4fbcf30fb6cb5d44b96f338f143c1
diagram-diagram = diagramma
# One app, eight kinds (mind map, org chart…); a 'thing' is whatever the kind is made of: an idea, a person, a step.
# en: a6c5e06888a8fcbcb520ea2a9952009715b62e25
diagram-mind-maps-org-charts-family = Mappe mentali, organigrammi, alberi genealogici, corsie, cronologie, Venn, piante dei posti e reti, disegnati da poche righe.
# en: 5c943d9da9c2dfa4508b7318865477cb55850904
diagram-empty-diagram = Un diagramma vuoto
# The kinds, one of each kind's things (Insert's item), and how a line of each is written
# en: fcb9bd322ef2e2b0e304d49bdafd2842995a47e6
diagram-mind-map = Mappa mentale
# en: 2cd7504a5a56c5729f37aca4d0234b698e0c0afe
diagram-org-chart = Organigramma
# en: f78fddbccd57da0c8456fd39da6c21cdc0371020
diagram-family-tree = Albero genealogico
# en: 5a79fb6ed9e87efcbde2485d08845fe16296c303
diagram-swimlanes = Corsie
# en: 018514a3d58aa08353dd5e387ee29de45981c409
diagram-timeline = Cronologia
# same
# en: e5c282f3e15ca1cf6a0b7837f7c7cd8b2bc12783
diagram-venn = Venn
# en: 840cfb1a1746bbb150371dbcf3ed341983a80c11
diagram-seating-chart = Pianta dei posti
# en: 53ebc572b4a44802ba114729f07bdaaf5409a9d7
diagram-network = Rete
# same
# en: bd69a4732fe12702d5ff5838852eb29e4a9e2e02
diagram-idea = Idea
# en: 8c41ae88467fe5bbad09fcd488662b25c3ec5333
diagram-person = Persona
# en: dc416e1088e4bf094dfc9abe0210e0288f5a169e
diagram-step = Passo
# en: 448ab73ba1c21e671e218fb91f2644c834f0c16f
diagram-set = Insieme
# en: ecdda59aea5ee67d7d854c969ccf7f4f4b4a4c54
diagram-thing = Elemento
# The picture, and the line editor over a thing
# en: c2e45b49b02d2ac7e1baf25d9d0a2f5c257281ad
diagram-tap-empty-space-for-thing = Tocca uno spazio vuoto per aggiungere un elemento. Per collegarne due, premi Unisci e toccali entrambi, o trascina l’uno sull’altro.
# en: d4b16450c157188d2cf2e3968faee3709ebeca28
diagram-tap-here-to-add-first = Tocca qui per aggiungere il primo elemento: { $thing }.
# en: ccdb7bfa4c6b71a69f1931253fe6f892a2baf89b
diagram-tap-in-lane-to-add = Tocca una corsia per aggiungere un passo. Tocca un passo per modificarlo. Trascinalo in un’altra corsia, o su un passo per metterlo dopo.
# en: 639d02ad26e5be80f5baf69835b953dfc015178b
diagram-tap-thing-to-join-name = Tocca l’elemento a cui collegare { $name }. Tocca uno spazio vuoto per annullare.
# en: 5d36f27a0649ac9ae67fb2e66f5be89ebc4719c8
diagram-tap-first-thing-to-join = Tocca il primo elemento, poi l’altro. Tocca uno spazio vuoto per annullare.
# en: 8953058d46b225514231aca0b8643f4e72547676
diagram-this-thing = Questo elemento
# en: 53ea183a6bb5ad2942edd6884230b8f425c0eea6
diagram-add-under-it = Aggiungi sotto
# en: e9e7205b6f0bd7d9c8f1a1dfe85ef9d54979662f
diagram-add-one-more = Aggiungine un altro
# en: be34070c33b5c14155fe70a18891828387dd399d
diagram-add-after-it = Aggiungi dopo
# en: 90d24ab49426f19e75a2b6c3fd9196603c2e0852
diagram-add-step = Aggiungi un passo
# en: e0d73143de80d17e82de2e017ac156ca3b9c4e01
diagram-join = Unisci
# en: e45795fb6033ae4ecc1e2e3610273fce71a317d7
diagram-make-it-plain-line = Linea semplice
# en: 3a4758c3cc8dac2d76026d0733816741f9b21d43
diagram-make-it-arrow = Freccia
# en: a07496767ed7e5caf20bb803434a1aa088aaa97b
diagram-what-connection-says = Etichetta del collegamento
# en: 7d531617dd394cef59d3cf58fc32b3bc458f6744
diagram-who = Chi
# en: b48a4ad455ccc1431a4d3304864d95fb5de61df2
diagram-connection = un collegamento
# en: ad87109bfff0765f4dd8cf4943b04d16a4070fea
diagram-empty = vuoto
# The templates
# en: 8b0bc4ee7e0e6e592c5e8812fef8883b9cbc66de
diagram-empty-kind-to-start-from = Un punto di partenza vuoto: { $kind }.
# en: cc9cfe196eaec8bbe041a0f648039cf31df71bc7
diagram-browser-api-database-cache-and = Un browser, un’API, un database, una cache e un worker, e come comunicano.
# en: 87796704431b42da8083f869f5ed707dae8cf8fe
diagram-building-project = Un progetto edilizio
# en: 5accd00ffa799aafee66a6e2e7a77c3e89abdd38
diagram-launch-and-everything-that-branches = Un lancio e tutto ciò che ne discende: prodotto, marketing, assistenza.
# en: 9261260de34a3ec89f2846b1c6a53b8adc25bb35
diagram-package-through-store-warehouse-and = Un pacco attraverso un negozio, un magazzino e un corriere, con una decisione.
# en: 0ef1081dd660cc404f38216048590ca0999c05d2
diagram-small-company = Una piccola azienda
# en: 6dea73ecffb81e3db543a664a3ba6e602d58683b
diagram-wedding-dinner = Una cena di nozze
# en: 1086ae322f0484af87b4a35b9537b35ad53ec68b
diagram-year-of-dates-from-plans = Un anno di date, dall’approvazione dei progetti all’inaugurazione.
# en: c75834baf2bd8482dbb5a822f4466908244e65fa
diagram-cats-and-dogs = Gatti e cani
# en: 9e4600a93df1d0ffd290278244beed2111ac5cff
diagram-computing-briefly = Informatica, in breve
# en: 4944a571da52f0920a54f002e637dfc6e179603f
diagram-fast-cheap-good = Veloce, economico, fatto bene
# en: 77373004b00a68bf2cad476daa1ef0af2a7e26f0
diagram-four-tables-and-who-sits = Quattro tavoli e chi siede a ciascuno.
# en: 1db47899ccb6eda1f1c46cee3c73acb1394c00ca
diagram-from-lovelace-to-now-spaced = Da Lovelace a oggi, con le distanze fedeli agli anni e le epoche lungo il fondo.
# en: c973a2e43350a1c09697af1bd39a17f3cfba2c36
diagram-from-order-to-doorstep = Dall’ordine alla porta di casa
# en: 91519d37fd9fe6f0c40b0429e0ed9f8eb8206006
diagram-from-job-description-to-yes = Dalla descrizione del lavoro a un sì, corsia per corsia.
# en: bfd1a142e965498fd2dbaa45ca87c1cbdc9071c9
diagram-grandparents-their-children-and-grandchildren = Nonni, i loro figli e nipoti, con gli anni.
# en: 347a51bd3c26ccac83baeca51966f318d5bb06c4
diagram-hiring-someone = Assumere qualcuno
# en: f30d75896062b87258051feec53d9f7c05059037
diagram-how-app-hangs-together = Com’è fatta un’app
# en: 70a97689961708e74a02157e6675bbcab893b7a4
diagram-seven-people-who-reports-to = Sette persone, chi risponde a chi, e una linea tratteggiata.
# en: 45ccf051d72194e5207999d9eeabaf9311e07ec2
diagram-garden-this-year = Il giardino di quest’anno
# en: 3fa0b6c790e0b44a046fe73aa9cf77f99106074d
diagram-three-generations = Tre generazioni
# en: 206f4033c4733b2b04a85ee0de9d35b1a5acc692
diagram-three-sets-and-every-overlap = Tre insiemi e ogni intersezione, con cosa sta dove.
# en: 762ecdafab9b2868da1121459828ec245b03ac5e
diagram-two-sets-and-what-they = Due insiemi e cosa condividono.
# en: f02e532d172e25cb200306e2edda8e4331418dcd
diagram-what-to-grow-and-jobs = Cosa coltivare e i lavori da fare, come mappa mentale.
# en: a6847567865dbe1e5266bbcd7f1f4e0049ee9eb1
diagram-biology-final-in-december-topic = Un esame finale di biologia a dicembre, argomento per argomento, e come organizzare lo studio.
# en: e32c422ee266430ea9dd0cd2cc78750a1342302a
diagram-classroom = Un’aula
# en: e491ee6c30111d9c51d83d4a19aba47a3c39c769
diagram-family-with-godmother = Una famiglia con una madrina
# en: c164cf0f878062c2b43b69bf4c1de2c3d6a1f94d
diagram-principal-her-assistant-principals-classroom = Una preside, le sue vice, i docenti di classe e il custode.
# en: f25d2f240d3a52d5361d9b6dd4d8561290566159
diagram-move-to-lisbon-by-march = Un trasferimento a Lisbona entro marzo: documenti, una casa, lavoro e vita, e cosa deve venire prima.
# en: d2586903dd907f55b8076edbe00b87f4e45ab92f
diagram-elementary-school = Una scuola elementare
# en: 3eff234615aa3d538d44f11142e266d62b44ef43
diagram-restaurant-kitchen = Una cucina di ristorante
# en: 3fecd5a70de57bb7748a775d7d4c6072bace1e50
diagram-router-and-everything-on-it = Un router e tutto ciò che vi è collegato: portatile, telefono, stampante, televisore e campanello.
# en: 949c596fb3177561b6f2515cbc92b6b68a4292c2
diagram-team-by-its-skills-design = Un team per competenze: design, scrittura e codice, e chi ne fa più d’una.
# en: eeb20483d989d9deef42a5ae150f171af0bc6201
diagram-expense-report = Una nota spese
# same
# en: ded9774849cab88a3dd08936595ffe270dd397a2
diagram-apollo-11 = Apollo 11
# en: b5723994f111884ca2f9a82ecb525fb6992e44c8
diagram-board-game-night = Serata di giochi da tavolo
# en: d69e423520fc900afc06f3d31ab286694fb7d67b
diagram-class-4b-at-four-tables = La classe 4B a quattro tavoli per colore, e l’angolo lettura.
# en: d8d0862686b742040e32f8f3235084ad61fcef28
diagram-eight-days-in-july-1969 = Otto giorni nel luglio 1969, giorno per giorno, dal lancio all’ammaraggio.
# en: ce31ba59543ea424a6019bc67976ace141d62d09
diagram-four-games-table-each-and = Quattro giochi, un tavolo ciascuno, e chi gioca a cosa.
# en: 9d35a9836a6bb4c6180f6c2880c8c19c22ed4ea0
diagram-from-photo-of-receipt-to = Dalla foto dello scontrino alla busta paga, passando per un responsabile e l’amministrazione.
# en: 1f1489585228c4bf2d9599bdff9fef70f59b4a60
diagram-moving-abroad = Trasferirsi all’estero
# en: a04755781fd967ec44d2f47f1ebf6ff83b2fe909
diagram-patrick-and-maria-their-six = Patrick e Maria, i loro sei figli con gli anni di nascita e di morte, e la zia che li ha cresciuti.
# en: 56aa5ec3b6a5e62a57ce1e1223c5f1f8148a7e02
diagram-studying-for-exam = Studiare per un esame
# en: d7cda8e6bd3d07fe1968c61d6b068203911ae45c
diagram-sea-clouds-mountains-rivers-groundwater = Mare, nuvole, montagne, fiumi, falde e piante, e come l’acqua si muove tra loro.
# en: a1da7a04adf4a0189219b39bddb2518c44ba382f
diagram-brontes = Le Brontë
# en: 0c2311a818005e4508a11aa6a888f61a45bd9a3b
diagram-brigade-under-head-chef-front = La brigata sotto lo chef, la sala accanto.
# en: 0c62114de8628cfe00011bba9cc35f003279ac83
diagram-house-network = La rete di casa
# en: 1fcf7cc436a073faa316df56cf1a4d3ec2b87d6e
diagram-water-cycle = Il ciclo dell’acqua
# en: cdb628c70ae8584f4098828ec8a65f19d44697b8
diagram-three-generations-of-morenos-and = Tre generazioni dei Moreno, e una linea tratteggiata verso un figlioccio.
# en: 0e60bdf5cc3dbaa6c2018bd31c760c1e46e79ab1
diagram-who-can-do-what = Chi sa fare cosa
# en: b27a04f87f9d4657107a8dbd89d32eb1dedb41b7
diagram-tap-empty-space-for-branch = Tocca uno spazio vuoto per aggiungere un ramo. Tocca un’idea per modificarla, Enter per la successiva. Trascinane una su un’altra per annidarla. Unisci ne collega due da una parte all’altra della mappa.
# en: fd23500d007e121f9530bb8b530f367ed9e00825
diagram-place-cards = Segnaposto
# en: dd9ef7db14a8bdb18f7a266d6e91711443e71a29
diagram-print-place-cards = Stampa i segnaposto
# en: 030e26916d4c1d1ca0c41b3b447dde54ed891dbd
diagram-print-place-cards-card-guest = Stampa i segnaposto: un cartoncino a ospite, otto per foglio Letter, da ritagliare
# en: face83ee3014bdc8f98203cc94e2e89222452e90
diagram-guest = Ospite
# en: 5734dbf560e03e0dea1a1bd85af5088238d5d0e4
diagram-new-idea = Nuova idea
# en: 32c6bde8aa4d539c3b773b1f4cf66e15aa427faa
diagram-tap-empty-space-for-person = Tocca uno spazio vuoto per aggiungere una persona. Toccane una per modificarla, Shift+Enter per il suo ruolo, Enter per la successiva. Trascinane una su un’altra per metterla sotto.
# en: 5f7463cc9e2e8a2e25990127091710a286d9765a
diagram-tap-empty-space-for-event = Tocca uno spazio vuoto per aggiungere un evento. Scrivi la data, Shift+Enter, poi cosa è successo. Le date sono distanziate in scala, e un intervallo appare come una fascia.
# en: b6395077670d276b6a207a6eadb6f5a17c1fa854
diagram-lanes-name = Il nome della corsia
# en: 769bb19e615b7f8e2809e5882e2d05a18f57a531
diagram-when = Quando
# en: b23ea75ecf303b9756682c84abecebc7a010f2b1
diagram-tap-person-to-type-on = Tocca una persona per modificarla. Scrivi + e un nome per il partner, Shift+Enter per gli anni, Enter per la successiva. Trascinane una su un’altra per metterla sotto. Unisci traccia una linea tratteggiata.
# en: 14e56ce6d5f3d8d56d2ce979bf2eb20aaa9dd93d
diagram-tap-empty-space-for-table = Tocca uno spazio vuoto per aggiungere un tavolo. Tocca un tavolo o una persona per modificarli. Una virgola inizia l’ospite successivo. Trascina una persona a un altro tavolo.
# en: 7049f105f3a76be9cb8c6d7b74eb3edf60d9a7da
diagram-tap-inside-circles-to-add = Tocca dentro un cerchio per aggiungere un elemento. Una virgola inizia il successivo. Tocca il nome di un insieme per rinominarlo. Trascina un elemento tra i cerchi.

## the Trip Planner

# en: fdd91fbac0e5654a70026a229cc8a5d869157b24
trip-trip = viaggio
# A stop is a place on the route; { $n } is its number, { $time } a drive such as "1 hr 38 min". 'Trip Planner' and 'Plan' are above.
# en: 46644fef83a4f92870b2bda5079d97dae8b05b1f
trip-route-on-map-stops-in = Un percorso su una mappa: tappe in ordine, ognuna con una nota, e la distanza tra loro.
# en: 199cd6e4be673dbec0dfaaa645071e949f5480cc
trip-gpx-route = Percorso GPX
# same
# en: 97eeda258d4d0c87a81a7741038e625eda23a2a6
trip-geojson = GeoJSON
# The bar and the map
# en: 63746c80a9900aa0b9df832d6fe50b7318a88aab
trip-a-place-by-name = Un luogo per nome…
# en: c86d6e7640906afe6a57236c004f0b1af53b6ee8
trip-stop-at-middle-of-map = Tappa al centro della mappa
# en: a52fccf0e1e5beca9d5885f1638d5e9a6a2684f9
trip-measure-in = Misura in
# en: 2458f1444290ced8aefad04d5c947b17bf9a81fb
trip-hours-of-driving = Ore di guida
# en: 5fa6c4032be31076212eb57f2fe6ba44d445d501
trip-miles = Miglia
# en: 87bafdbb82c61625882d74515ef2c7e566177ea5
trip-kilometers = Chilometri
# en: 8e49f86b47ba8e4ac259af7b5428623e7332489c
trip-join-stops-in-order = Collega le tappe in ordine
# en: 7bdcf970899e9519b75f2dc24d1909f670b283cb
trip-show-whole-route = Mostra tutto il percorso
# en: fa157c9ab413b3c415d7ada7457694a35c7869a1
trip-where-i-am = Dove sono
# en: ab478f3efc840eebab919dff1b9512286f70c10c
trip-map = Mappa
# en: 4fa4643900d7a129558f6c34b681a8d419a9ef9d
trip-map-tap-to-add-stop = Mappa: tocca per aggiungere una tappa
# en: a481372d94c5d404a0bd0a597cda747c83e952a4
trip-map-comes-from-openfreemap = I riquadri della mappa vengono caricati da OpenFreeMap finché la mappa è aperta.
# en: dd1ac7c6150bf40973c618ac841d01f2281dea20
trip-your-location-is-asked-for = La tua posizione serve solo a centrare la mappa e non viene mai conservata.
# en: 6c4827a34debc3c12e8a905f5e8025f0d22802cb
trip-n-stops = { $n ->
        [one] una tappa
        [many] { $n } tappe
       *[other] { $n } tappe
    }
# en: 44896c642dce2a144eb35fdb61cedb762cc44ca1
trip-stop-n = Tappa { $n }
# A stop's number is its handle; the bar under stops chosen whole.
# en: 372c19ab2c53f7582cdbe3823523a8760d0f2807
trip-stop-n-tap-chooses-it = Tappa { $n }: tocca per selezionare, trascina per spostare
# en: 56f844200d56e1fc382c81f28972a39aab61e019
trip-chosen-stops = Tappe selezionate
# en: 0e648419ea806b0cc4db81617f95870a094f3639
trip-stops = Tappe
# en: a9d55cf1a8a7b85ab9e293fc1e40a440986b0725
trip-show-on-map = Mostra sulla mappa
# en: bdea0edfea6bebf4baf952432856faf7b3f43890
trip-name-of-stop-n = Nome della tappa { $n }
# en: 4dad38541848da253722328a5517dffdda35b4ab
trip-note-for-stop-n = Nota per la tappa { $n }
# en: 0a8abf5522e2f20b1f976982533aabd909645324
trip-about-time-by-car = circa { $time } in auto
# en: 7f85e32db6c77473c8b172d1ad1dab75462705a3
trip-tap-map-to-add-first = Tocca la mappa per aggiungere la prima tappa, oppure Inserisci un luogo per nome.
# en: 472fd6a8979384a06de401f16cafb9cfdd9a824c
trip-insert-place-by-name = Inserisci un luogo per nome.
# Finding a place by name
# en: b75a19207f834200f4801a2db37886567baf25bc
trip-place-by-name = Un luogo per nome
# en: 7d7388a1d59910888c95c66fed24ad82cb5edbf2
trip-find-place = Trova un luogo
# en: 57d3470391ec96a8442196a4ff85cf39e4f65e98
trip-town-address-museum = Una città, un indirizzo, un museo
# en: bce06414177f72ab70e6387b6af9f8ceef0d6049
trip-search = Cerca
# en: 1a6a5ba8c23ddb672874a2996abaee1fe933abcd
trip-searching = Ricerca…
# en: 07a4d61733e108a8ffa6e5753e09227b6a1a0f80
trip-searching-sends-words-you-type = La ricerca invia solo ciò che scrivi a Nominatim di OpenStreetMap.
# en: 2b36ec5f26fb5c35fccb5edd05776349d238b677
trip-places-found = Luoghi trovati
# en: 6c70807e19d1f88aae7d66770719debbaf4ae89b
trip-nothing-found = Non è stato trovato nulla.
# The templates
# en: ce482808305f25f4c7f63905061b0c411444f12c
trip-week-in-portugal = Una settimana in Portogallo
# en: 3a4002be5f16560bb462d3f37d8b2caac8a65603
trip-lisbon-to-porto-by-car = Da Lisbona a Porto in auto, in chilometri, un consiglio a ogni tappa.
# en: 72fa00e64f1816bfe62cd5e5ebae7ddd8bbc1d59
trip-down-pacific-coast = Lungo la costa del Pacifico
# en: 6d871c8c9ed845cfaaafff0c18e335ce6da9ba42
trip-san-francisco-to-los-angeles = Da San Francisco a Los Angeles sulla Highway 1, in miglia.
# en: 8396776ccda695ac7d6e5f12a1eaa4dd3edecfac
trip-scottish-highlands = Le Highlands scozzesi
# en: 7a3f06a64060636652afe5912e0a00016bc3d17f
trip-loop-from-edinburgh-each-leg = Un giro da Edimburgo, ogni tratto in ore di guida.
# en: 9660e47a7aad398fbc88947cd22e8628b2a92115
trip-rome-places-to-see = Roma, i luoghi da vedere
# en: f01c658cc1c5b1dbfba8045b885174d2f5a3d154
trip-places-as-dots-not-route = Luoghi come punti, non un percorso: cosa vedere e quando andare.
# en: e50e4931f42687faef4a226f93981bb38a937ce9
trip-weekend-in-copenhagen = Un fine settimana a Copenaghen
# en: 402e0be1180f76470536e904cec4f7242211bb15
trip-friday-night-to-sundays-train = Dal venerdì sera al treno della domenica, a piedi, in chilometri.
# en: a5594e90d42f49b6ce9e2842193b64f380d1a10c
trip-icelands-ring-road = La Ring Road dell’Islanda
# en: b237aa87bc63dccebef93e19a8ef785d96ba69ce
trip-ten-days-around-island-by = Dieci giorni attorno all’isola in auto, ogni tratto in ore di guida.
# en: 89059cee91b704cf1c0e42de4225df2968a207e7
trip-dublin-food-crawl = Un giro gastronomico a Dublino
# en: b934fa6dfc063b38e47ce12ed4622e1cc0d55b75
trip-seven-places-to-eat-in = Sette posti dove mangiare in un pomeriggio, da ovest a est, a pochi passi l’uno dall’altro.
# en: 2149c2c628bda1d9ea8522144f7ca59ce2a6bcc8
trip-yosemites-mist-trail-loop = L’anello del Mist Trail a Yosemite
# en: 056b43a68d915001b02640fbb4ec910045a406ad
trip-two-waterfalls-on-day-hike = Due cascate in un’escursione di un giorno da Happy Isles e ritorno, in miglia.
# en: b1365d430388f423cf7142e4a78c7470fed8a5fc
trip-loire-by-bike = La Loira in bicicletta
# en: e0fc4a0bf8e42cf48f5f6825bc3b8420df625254
trip-orleans-to-saumur-in-six = Da Orléans a Saumur in sei giorni, di castello in castello, in chilometri.
# en: e68d998a80765bfa302dd2b477f31c97db0d51d2
trip-college-tour = Un tour dei college
# en: 02b9d4cf509b27e9011826d208a7831782bb08a6
trip-six-campuses-in-new-england = Sei campus del New England in una settimana, una visita prenotata a ciascuno.
# en: 651b0f889a962febf3a80370511cbc08abac73da
trip-japan-by-rail = Il Giappone in treno
# en: f687060ca9b759a7ed4bca61f7a2bf96764f2f8e
trip-tokyo-to-miyajima-in-cherry = Da Tokyo a Miyajima tra i ciliegi in fiore, in treno ad alta velocità.
# en: afea6c128d27238aad4e11871dfff6f692334301
trip-last-100-km-of-camino = Gli ultimi 100 km del Cammino
# en: 33d01f381424bbc8bbd1b6a9487b3a53c38d07e9
trip-sarria-to-santiago-on-foot = Da Sarria a Santiago a piedi, una tappa al giorno.
# en: b15aca8406aa957e0b92331f3c94b96775672e6b
trip-new-york-in-movies = New York nei film
# en: cdd506e6983757bd11c62cbbe6a0acbbd4002303
trip-seven-film-and-tv-locations = Sette luoghi di film e serie TV, da nord a sud, in un giorno.
# en: 2cf068b9c859d837fbc257f1dc20a64d0d96b2b0
trip-wedding-on-lake-como = Un matrimonio sul Lago di Como
# en: a3dec1f6e3f5856eb26a70a9c329744d499a1afc
trip-for-guests-where-wedding-is = Per gli ospiti: dov’è il matrimonio, dove dormire, come arrivarci.
# en: 0fbbb28a6e64acfee9300ecf05016dcf149a5a19
trip-presenting-trip = Presentazione del viaggio
# en: 24848d1e92a4b831f8fdae547c2fbfdc0d1e441b
trip-presenting-next-stop = Tappa successiva (in presentazione)
# en: a802f6e93c981ee6dd02df366f0141ca3aa085e0
trip-presenting-stop-before = Tappa precedente (in presentazione)
# en: 3b14d20764a1fdef5ee74f4defab4ff20b0e7cce
trip-put-stops-on-calendar-day = Metti le tappe su un calendario, un giorno ciascuna
# en: 16fa5ad4958332a6bbb1eae6d1a8c6ee6f2c7752
trip-first-last = Prima o ultima
# en: 0aa341109cff3c75e204930fdeac94f52278bb67
trip-next-stop = Tappa successiva
# en: 35bc0362a4899961a0e878990611c13021c1e549
trip-stop-before = Tappa precedente

## shared: the Word Processor's looks, the header's Home, a money column's currency

# en: 958de540438a0fa530d47d2c072d0d9c22cd2af5
looks-typewriter = Macchina da scrivere
# same
# en: a5c78a86fab1c02cd981c23b8bad5dad3e7438e3
looks-serif = Serif
# same
# en: 70f8bb9a8a5393ef080507a89e4b98d139000d65
common-home = Home
# en: e070de224434a2acd352b35cec46f34f9e08e1b2
looks-currency = Valuta

## the Calculator app

# en: a0015ec89d8034b2ca4a8f0219350514e19294a0
calc-calculation = calcolo
# The tape is the list of lines worked out, as on a printing calculator. 'Calculator' and 'Numbers' are above.
# en: ab4ea6f8fe06812a128297560bee7aff1be0c040
calc-calculator-that-shows-its-work = Una calcolatrice che mostra i passaggi: nomi, unità e conversioni, e grafici di y = f(x).
# en: f146f8e93fc9312f6b8003b048cd24d1574469af
calc-tape-text = Nastro come testo
# The bar
# en: 9a7405ebcedde5be8d095a986ea8794e19ee84e2
calc-graph = Grafico
# en: a3310f1f9bbb12cd753850392faec8453a10c709
calc-clear-tape = Svuota il nastro
# en: 14a09e767bb648a339ba82fb609c02f3d9aa4228
calc-clear-graph = Svuota il grafico
# Insert: functions, and what the second engine reads
# en: 2b961dea1dc0c60ddf9a2c8e9d090f6f7d082483
calc-functions = Funzioni
# en: ca0c5d6d0a40f5f2e6f47ee8fc8b934a3eece03f
calc-sine = Seno
# en: c1951ad44359d27f765c0f1c7bfea678577a3fb1
calc-cosine = Coseno
# en: 7ef1446b5f4ac08a82f28ef66bf019af3ed9c3c5
calc-tangent = Tangente
# en: f90781f1beba7ea766ef6fddf4672221c99da01f
calc-natural-log = Logaritmo naturale
# en: c4607860d3bb073b2fe96de25c2566b33f6e5610
calc-log-base-ten = Logaritmo in base dieci
# en: 47a3278f023594b94c900b5d792366be2e8b3d39
calc-square-root = Radice quadrata
# en: 35e4a1a9ace5e53c1521b13130f3b1fce0bb312b
calc-absolute-value = Valore assoluto
# en: 8e4e872b30d442c4d7f1edf2cabdff971300b607
calc-factorial = Fattoriale
# en: c584662e0778e58334ec2e9f7fc7f58a98d4dca8
calc-e-number = e, il numero
# en: f3afae23c74a7d1a42a52c0c47bfeb1191b6b6e9
calc-x-for-graph = x, per un grafico
# en: 1cfd7bfc7d3d79d7ea28a91bdc6e032559103831
calc-units-and-algebra = Unità e algebra
# en: de1e4faaa9758db564ba458c3956824881efcd9c
calc-convert-to = Converti in
# en: 95562b515314072f0bc7658aa71f2ef77371d893
calc-derivative = Derivata
# en: 965a00d9ba9665ad57ca3edefdcca07a61d3ca95
calc-simplify = Semplifica
# The tape, the line being typed, the keys; { $answer } is a result such as 42 or 7.62 cm
# en: c51c55b719457118a73f5732f4dd4772aaba2e20
calc-tape = Nastro
# en: 1acb1c0448ace57b632dc2d56121f45a18e646be
calc-line-n = Riga { $n }
# en: 43885eadc7bc789d89e6e81db680818d2dd1b223
calc-put-answer-in-line = Inserisci { $answer }
# en: a9c16dd084ce3781568419133b0fa0c0f57aa727
calc-no-answer = Nessuna risposta
# en: cf23123f857abeda1d28fc9b85cc7eba8d20f3b1
calc-take-away-line-n = Elimina la riga { $n }
# en: fc9ce14b28c6f2c3b72caf056ca604b2b96f7d2b
calc-sum = Somma
# en: fdb6ecce95257d64ccde93310bf9a9adc8ad249e
calc-type-or-tap = Scrivi o tocca
# same
# en: e1745e3e21e84b24c379af6f45a18e1a21e56577
calc-y = y =
# same
# en: 97e60be18b1afcca3cde2fc6df4343208cefb0a1
calc-y-equals-ellipsis = y = …
# en: 71f2d6a97665cb72b50a6384a06af3e014b96db5
calc-at-x-1-answer = per x = 1: { $answer }
# en: e5651c683f14c95aa972cfdbc300d9fecfe02019
calc-keys = Tasti
# same
# en: 88d130a66de8e5db01660642d9f23e1f0eef97dd
calc-backspace = Backspace
# en: d1149c36a0edcfbeae98bf270da3f543b6c6a866
calc-clear-line = Svuota la riga
# en: 097a41c8c7e58b9b655d7b3e31a3673466595450
calc-answer-before = Risultato precedente
# en: 2ee9e26d39d7113bd8fea80639d6257ab1bdf8cc
calc-type-sum-or-3-inch = Scrivi un calcolo, o 3 inch to cm, e premi Enter. a = 12 salva un risultato con un nome.
# en: 0bef86b24e006bd994db1509b268156522c7dc2c
calc-type-curve-in-x-such = Scrivi una curva in x, come x^2 o sin(x), e premi Enter per disegnarla.
# The templates
# en: bcb584ffecef3a17141a771a3ceedbbe6d474ca1
calc-splitting-bill = Dividere il conto
# en: 0a45fc60c975ea141733f982179ead17af8767b6
calc-food-drinks-and-18-tip = Cibo, bevande e una mancia del 18%, divisi in sei, ogni passaggio conservato con un nome.
# en: 2c9e678b58314997051ff2c13d56c92ea6bce7d7
calc-shopping-total = Il totale della spesa
# en: d8719443b912bfaadd4f5d8fb2f1fc095f58ff52
calc-tape-of-market-apples-and = Il nastro della spesa al mercato: mele e formaggio a peso, il totale, e il resto da $60.
# en: 56d12d641f4f4177e63e120c8bd10a8e7348357f
calc-tax-on-price = Le tasse su un prezzo
# en: 8a7d0a08d1e03c2974f84aa039e7871c5b232245
calc-new-york-city-sales-tax = L’imposta sulle vendite di New York City aggiunta a un prezzo, e tolta da uno scontrino.
# en: 80296be8eee3142eb634c0045f82e15b5e5373aa
calc-percentage-change = Variazione percentuale
# en: 93650e756cc879e41310d678219f483e5ce2cfd1
calc-rent-up-from-1-450 = L’affitto sale da $1.450 a $1.595: di quanto, di che percentuale, e rispetto a un aumento di stipendio.
# en: 9ff9fc7e0344944578d50820e0326f7bf34f1c8e
calc-kitchen-conversions = Conversioni di cucina
# en: c7ccdb52f144fcec56adb8ecb5264f35d03600c0
calc-cups-ovens-spoons-and-weights = Tazze, forni, cucchiai e pesi, da una misura all’altra.
# en: 267b3d4696b05cc65039fcf4afb8cd9548ed5a29
calc-scaling-recipe = Ricalcolare una ricetta
# en: a0e9dcbc29ed1364a4891c3671dd43675af64d11
calc-banana-bread-for-eight-made = Il pane alla banana per otto fatto per dodici: ogni quantità per uno e mezzo.
# en: 8639704eb84800c829b41e6fcd833d686dcb41f6
calc-unit-conversions = Conversioni di unità
# en: 2aef2060ccb74d32576f5b1f936372bdd97252f3
calc-feet-to-centimeters-miles-to = Piedi in centimetri, miglia in chilometri, libbre in chilogrammi, Fahrenheit in Celsius.
# en: 7b31203b4780df1cd410c84049ed4d031dacc8e3
calc-currency-at-rate-you-type = Valuta a un cambio che scrivi tu
# en: 5f4e47693383fd619db1b39871b821a7fccf86df
calc-trip-priced-in-euros-and = Un viaggio calcolato in euro e convertito in dollari, con la commissione della carta in più.
# en: 6645ae7e46c209b7ba6f5fb3b6aa707395a2c3d2
calc-fuel-for-trip = Carburante per un viaggio
# en: e2d3235c5cfd9ceffb4e54f0635e4f3841b0c0e1
calc-boston-to-montreal-and-back = Da Boston a Montréal e ritorno: miglia, miglia al gallone, il prezzo, diviso in quattro.
# en: bb294d581aa3512dfdaf06cb5705338f026425ff
calc-paint-for-room = Vernice per una stanza
# en: 8899142eaeb03e3a2cfc17f5e68f1977478e2ce5
calc-walls-less-door-and-windows = Pareti meno la porta e le finestre, due mani, in barattoli da un gallone.
# en: fa9aac4028931969e4e43d5926f21c1c02b03737
calc-time-zones = Fusi orari
# en: daa6b831387e404e18a932466e1b26486e942c1b
calc-one-call-at-9-in = Una chiamata alle 9 a New York, e l’ora a Londra, Berlino, Mumbai, Tokyo e Sydney.
# en: 4126383a0888802d508caf9f1e9a973554c6eb7e
calc-running-pace = Ritmo di corsa
# en: 73e59d9404aa7a32f2e7e9ae9ff609c2a74d14cb
calc-10k-in-52-30-minutes = Una 10K in 52:30: minuti al chilometro e al miglio, e la mezza e la maratona intera a quel ritmo.
# en: d1411ae3cdd27fda5ea57577c408be223f586cf0
calc-body-mass-index = Indice di massa corporea
# en: cf37a053ab6daf8527ff908a4479b6fb38654155
calc-weight-over-height-squared-in = Il peso diviso l’altezza al quadrato, in chilogrammi e metri o in libbre e pollici.
# en: 18c8c5aa1c31cb796ef6aa8086b794bc59e4d454
calc-dose-by-weight = Dose in base al peso
# en: a2cdd7739e2ff2b4f1ee78074c5c7981d1b877f9
calc-milligrams-kilogram-turned-into-milliliters = Milligrammi per chilogrammo, trasformati in millilitri di uno sciroppo; controlla ogni dose con un farmacista.
# en: 4699da98e2d343e04aa2465082aedd4d5053aa11
calc-electricity-for-appliance = Elettricità per un elettrodomestico
# en: d1b1126c73c13b523ce30bd2f563ad1a7b1c0210
calc-watts-hours-day-and-price = Watt, ore al giorno e il prezzo di un chilowattora: quanto costa una stufa al mese.
# en: 96aeea666f6bd696d83ef3dee80fff1fcc3ff896
calc-loan-payment = Rata di un prestito
# en: 9c2f158098b8fc30f79ae0d1db9391a68d8aea9a
calc-24-000-at-6-9 = $24.000 al 6,9% in sessanta mesi: la rata mensile e gli interessi in tutto.
# en: 3c48bd272b7ad823e277ca649218ae107832bca4
calc-compound-interest = Interesse composto
# en: ce79ef1a5e051c360028ef440ccc8258554abe0a
calc-5-000-and-200-month = $5.000 e $200 al mese al 5% per dieci anni, rispetto a quanto è stato versato.
# en: 813161b07c2ed5cab82b09f8c31b3810800bcd26
calc-break-even = Pareggio
# en: bee9b48a097d165fe0d11f7c3a7175019c158c5e
calc-costs-against-sales-for-coffee = Costi e incassi di un carretto del caffè: dove le linee si incrociano, le tazze al giorno che servono.
# en: a9047269b4f64dbbb2df8503315406b2b33fc4e9
calc-curve-and-its-slope = Una curva e la sua pendenza
# en: b5f43817a99082555a1fc4891fd2eb5bfaba6e10
calc-x3-3x-its-derivative-and = x³ − 3x, la sua derivata, e la tangente orizzontale in fondo alla conca.
# en: d4802215f2c0025bd9e3f3fe025230ceda4e830b
calc-waves-adding-up = Onde che si sommano
# en: 9e46b2d75638fb2ebe905ad0c4be8059be6487cc
calc-sine-waves-summed-on-their = Onde sinusoidali sommate, verso un’onda quadra.
# The grip on a line of the tape; the bar under lines chosen whole.
# en: fd71cff4626f555a0e69c5b6801a591cabd1d173
calc-choose-line-n-drag-it = Seleziona la riga { $n }, trascina per spostare
# en: dab2e3d9cf8c3bfccd20fa34fac6fc738ce9aba7
calc-chosen-lines = Righe selezionate

## two links compared (kit/ui/compare.ts)

# en: 8aa57de6dce6ee1c35c6aba7426503281876b258
compare-changes = Modifiche
# en: 8d105cf44d3926289e65c1c83d8e37cb23fd049e
compare-compare = Confronta
# en: 24512a18bc6d2c27213ad28b26ce9271d94175af
compare-no-difference = Nessuna differenza
# en: 8f0fb2d2ece91d9de4ed64f23a12b475c3e18970
compare-not-link-to-tiny-little = Non è un link a un documento di Ufficio Piccolo Piccolo
# en: e82be1221a13b593fd3fd58ffe24f3c3ba58f783
compare-paste-second-link-to-see = Incolla un secondo link per vedere cosa è cambiato.
# en: 442aef6fc360061295985657c4489b3c4d360cc3
compare-paste-link-to-document-as = Incolla il link al documento com’è adesso
# en: 7fb07fcb91ba19442009f16f24be4ef85b3eca16
compare-paste-link-to-document-as-it-was = Incolla il link al documento com’era
# en: 0ae84aa126111ee639f685e9ed05c6895e632a90
compare-put-in = Aggiunto:
# en: 210dd62a81e43d19e22018878ba665485e0526cb
compare-swap = Scambia
# en: c331654dfaed937af3dc0e72f31b21fdfb1aa325
compare-taken-out = Rimosso:
# en: aec0a618ef67ca171ab77615fc7cab57405fea3f
compare-first-link = Il primo link
# en: 123bc4a6d63cd1415119c84ed21412a29ef9fbcc
compare-second-link = Il secondo link
# en: 010030de6a30e85dd769e07201d8373ebff655c8
compare-two-links-to-documents-side = Due link a documenti, affiancati: le modifiche del secondo sono evidenziate. Nulla esce da questa pagina.
# en: 2053662dff5d94e9ea30321321ce6cd0df8f0027
compare-different-apps = app diverse
# en: f4e4b3a1d739ce43635eb9d75d97403c420c0642
compare-n-blocks-taken-out = { $n ->
        [one] { $n } blocco rimosso
        [many] { $n } di blocchi rimossi
       *[other] { $n } blocchi rimossi
    }
# en: 0041ce2f8795b8fbc93244ba17b668d115906ef3
compare-n-put-in = { $n ->
        [one] { $n } aggiunto
        [many] { $n } aggiunti
       *[other] { $n } aggiunti
    }

## files and zips dropped on the page (kit/file/open.ts)

# en: c99db7abba3f7227854d93a163ad3494de4e1571
open-opened-name = Aperto: { $name }
# en: f917dee4211bd4af58db8efec79e354e1ffb4912
open-that-file-is-not-words = Ufficio Piccolo Piccolo non può leggere quel file.
# en: 1d08903947cc83b648f8ad96b1e23466a2dbed11
open-that-file-is-too-large = Quel file è troppo grande.
# en: 8f432852569edbf7610713a6554e7a61396327d5
open-keep-them-on-this-device = Salvali su questo dispositivo
# en: c4fe6d8b035f6108e8a7e0037667dacf3d6cca25
open-nothing-is-saved-on-this = Su questo dispositivo non è salvato nulla. Salvali qui, o aprine uno.
# en: 0826daee1d616f7de3a2b205eb2360fcaccc77ef
open-first = Apri il primo
# en: 59d36bf6c42ab3ae1481fe62abbc67ffef7a8b22
open-saving-in-this-browser-n = Salvataggio in questo browser: { $n ->
        [one] { $n } documento conservato
        [many] { $n } di documenti conservati
       *[other] { $n } documenti conservati
    }
# en: 4fc6621d5b53d413dd1fd42cf7e7834ee3ecba5a
open-that-zip-holds-no-documents = Nessun documento leggibile trovato in quello zip.
# en: ed5d2e1ab481efa92392820d83922b25c236c730
open-n-documents-kept = { $n ->
        [one] { $n } documento conservato
        [many] { $n } di documenti conservati
       *[other] { $n } documenti conservati
    }

## a document's QR code (kit/draw/qr-picture.ts)

# Restored around the document: search, Find in this document, the shortcuts and the apps' keys, Mod+S, the size of
# everything, Add to home screen, another version kept here, where the link fits, Open in another app, the QR code
# of this document, Insert narrowed by typing, Trip presenting, a seating chart's place cards
# en: 775db36d459744f2dc73dcb147ab032f4b6f4a09
qr-code-of-this-document = Un codice QR di questo documento

## the keys, the shortcuts and the size of everything (kit/core/keys.ts, kit/ui/zoom.ts)

# en: e5737972ceac5c184d5009e9ee1746c4b3292f26
keys-normal-size = Reimposta zoom
# en: 4fc05f2763ba31e2d3be5f08e7d0bab5d5dcbf78
keys-everything-larger = Ingrandisci
# en: a4ae4b24a1f5369c2bff61abdbc221170e4b27d8
keys-everything-smaller = Riduci
# en: 67312061f24800b7dc75b07101329959c5c1af88
keys-keep-this-document-on-device = Salva su questo dispositivo
# en: 4d5e11a737e63d755f4127a0139f235f3794b6c6
keys-show-these-shortcuts = Mostra queste scorciatoie
# en: da05037a43419e15395f52f0ed4dcb0c7f75c1f2
keys-this-page = Questa pagina

## Find in this document (kit/ui/find.ts)

# en: 475c848673a3f79fa778f01c2bd5a721d4c41707
find-not-found = Non trovato

## a menu narrowed by typing (kit/ui/menu.ts)

# en: a9c25fead588babdd6b90b343a47f716f722312e
menu-nothing-starts-q = Nessuna corrispondenza per “{ $q }”
# en: ddf17f8747a6b36489443d6b09c25b429a1ea675
menu-starting-q = Corrispondenze per “{ $q }”


## who did what, listed for review beside a document several people write (kit/ui/review-panel.ts)

# en: 8aa57de6dce6ee1c35c6aba7426503281876b258
review-changes = Modifiche
# en: e6e3bb8760dfc9ea888b1967a09130f9c89fce15
review-none = Nessuna modifica da rivedere.
# en: 42e31dd677dc8b702293354c898041b64c77c442
review-put-in-for = Sostituito «{ $took }» con «{ $put }»
# en: f328a19b27f5338a00f443da396faccd6d9030a1
review-put-in = Aggiunto «{ $words }»
# en: a67a3c5917ce7d2467dc22ea5d88e34d7c253b5b
review-took-out = Eliminato «{ $words }»
# en: 0a327a9ace030c351cd61b21a1eff225ff12941c
review-put-back = Ripristinato «{ $words }»
# en: 309250888492d1a0aaebb8f6920e9776a0c0dcaa
review-restyled = Formattato «{ $words }»
# en: be485cefbc9f51f3315136dd5bb07ea3fa8d04c0
review-put-in-line = Aggiunta una riga
# en: 1f1fe15e0ff5fad870fa70dfa7d7c39cb13b807c
review-took-out-line = Eliminata una riga
# en: 7f356b013fff2debeaa8414c985236bd05276b21
review-changed = Documento modificato
# en: 92da3da547e5dd5677b18922b1611f08c61f4681
review-rejected-putting-back = Modifica rifiutata, ripristinato «{ $words }»
# en: b10117b3632f96b6169864b190e3c106a212dc2a
review-rejected-taking-out = Modifica rifiutata, rimosso «{ $words }»
# en: 30983f282a9a57909b378cd4134d143a067e0415
review-rejected-restyling = Modifica di formattazione rifiutata
# en: e235e19c7ec71b01d43fe842983f3a80c6212095
review-waiting = In attesa di te
# en: 6b94b0a9cbfbb2fc3ce5081c50246ab3016e4c73
review-yours = Tua, in attesa degli altri
# en: a90ec4fbb1f4f2050856da437722dada4ab986dc
review-reviewed = L’hai rivista
# en: 61a0572c4893ef34311320d84c82df88bea83e11
review-accepted = Accettata
# en: 27eeb7a291bfc566447d9cd928e98caf90f70ee6
review-rejected = Rifiutata
# en: 41b8f5693f30107a055b7507a7095b5ca0aa8fd9
review-n-waiting = { $n ->
        [one] { $n } in attesa
        [many] { $n } in attesa
       *[other] { $n } in attesa
    }
# en: bb54db510a92908a5a4df79fc1ad1eae8df50ec3
review-accept = Accetta
# en: 2b03b59293b6fc7101306f5d9ae1e96327bb419a
review-reject = Rifiuta
# en: 821d1f7909a5146fa98fd5228675c49e64c6e60b
review-accept-all = Accetta tutto
# en: 35c291a4ab2f675bdb9437918790287fcfec88fa
review-reject-all = Rifiuta tutto
# en: 76cc08ef327763a9a7b47697d90d71a69acbed05
review-accept-all-by = Accetta tutte le modifiche di { $name }
# en: 56db173f938aff6b5e405bb416ba178d4d344159
review-reject-all-by = Rifiuta tutte le modifiche di { $name }

## comments beside a document's words (kit/ui/comments.ts, kit/ui/comment-box.ts)

# en: fce06e20e5f7f74aacccab40b59b75a56c8f7305
comments-comments = Commenti
# en: af65ae0e9f04990618e53d608489530582356c11
comments-new = Nuovo commento
# en: 207b24fc9b9276a4b2709de85e55eb8adbba3806
comments-none = Ancora nessun commento.
# en: 4a88284dee66496310481a76d3d91ba0a1099aea
comments-select-words = Seleziona delle parole e scegli Commenta per dire qualcosa su di esse.
# en: 570aad8456c6d9321e051c22879ae5833cf0cfde
comments-words-changed = Su parole poi modificate
# en: 64d379f0d0c939707ccfbb7245f744611def8c96
comments-whole-document = Sull’intero documento
# en: d999aeb0545fa93c44c82d1abb928c06e3590523
comments-resolved = Risolto
# en: ac7f958cc028becfb4b2bec9c474bd2d5e8b6095
comments-resolve = Risolvi
# en: 61e05da2a47259dbae5eb58fad4b1af04dd69e07
comments-reopen = Riapri
# en: 6c2bb735a46a8ff307fe2e638d581295b2a49e09
comments-reply = Rispondi
# en: 3a71e78cdb4d792bb688c8dbba093a0bda884647
comments-n-replies = { $n ->
        [one] { $n } risposta
        [many] { $n } di risposte
       *[other] { $n } risposte
    }
# en: 911d801f12b06712dee871fc5f647eacc04e430f
comments-by = Commenti di { $name }
# en: 23b48bef02ad4d2437d3f19ab9df708fac256c00
comments-ask = Chiedi a { $name }
# en: 9dd346ebb60f70ca00c786e8697e934709bf0a73
comments-asks = Chiede a { $name }
# en: 13ff50a2189f50a0c931f16e02b060b37ec0208e
comments-answering = { $name } sta rispondendo…
# en: b37554f695b15005fd23907b9488e0a8ad4bca5f
comments-people = Persone
# en: 0f87ce5a3cbdf6796c6f152204e44b143201290f
comments-write = { $what }… @ per le persone

## a host's own pages: its table, its search, its header (kit/ui/table.ts, kit/ui/search-box.ts, kit/ui/header.ts)

# en: 4816c01fcfc82e618ba8d4f9f2d5cca84f36a4c1
table-filter-rows = Filtra righe
# en: f648af13b3a158a514634b7a27501c621e4f9c87
table-add-row = Aggiungi riga
# en: 45b553017087942f58e36f1963f58398aaa93cef
table-select-all-rows = Seleziona tutte le righe
# en: 9320afbefdcf309b4b763224769937b3936d517a
table-select-name = Seleziona { $name }
# en: e892255d168b0ccc00b895b653a7ff8d9a7ab4f0
table-no-rows = Ancora niente qui
# en: 7dc03a2b77e86b5ce3279f1239cf7eed2c3e31dd
table-no-rows-match = Nessuna riga corrisponde
# en: fc6c0582fa83a05374d53d05a9e4fbd9a76f7adc
table-sort-hint = Ordina per questa colonna. Maiusc+clic per ordinare anche per questa.
# en: c3cd636a585b20c40ac2df5ffb403e83cb2eef51
table-row-actions = Azioni
# en: 0a35ecd2f44a46e9904bd46d91557748cc409ac8
table-actions-for-name = Azioni per { $name }
# en: ab5297fdaa47a693168d73de9b199b904eddba8d
table-no-records = Scrivi per cercare
# en: bce06414177f72ab70e6387b6af9f8ceef0d6049
search-label = Cerca
# en: 1a6a5ba8c23ddb672874a2996abaee1fe933abcd
search-searching = Ricerca…
# en: 938206ae8c35210570eff0f625f7174736ab50d3
search-failed = La ricerca non è riuscita. Riprova.
# en: 445b04c118dbe3becf81b1490e4f09218cd85a09
search-n-found = { $n ->
        [one] { $n } risultato
        [many] { $n } di risultati
       *[other] { $n } risultati
    }
# en: 1c8d7da8241f46e35847a6ee94585aa15c895038
search-nothing-found = Nessuna corrispondenza per “{ $q }”
# en: 0ecef6f95577e3e82d8917d2d3e89d1aa83afd09
header-breadcrumbs = Percorso di navigazione

## the Board

# en: e879b0be0190766af9d315adbc46dcd7314f0b3f
board-board = Bacheca
# en: 9ea5e97d2f481d5427902c67e55a54ec377e4761
board-board-lowercase = bacheca
# en: d1b387380c728b48ad48dad8e820910a5b9823d8
board-cards-in-lanes-by-status = Schede in colonne secondo il loro stato, ogni scheda una riga di una tabella.
# en: bae7d5be70820ed56467bd9a63744e23b47bd711
board-status = Stato
# en: 8665aed3624f4916345a2b028d6d28d352ad4245
board-to-do = Da fare
# en: 9f1ffa416cd0e63113fa0244f18e15e1a1079c18
board-doing = In corso
# en: e9b450d14bc2363d292c84f17cfad5cfbd58a458
board-done = Fatto
# en: cf5fbf174610c73177abf9c8651380a7704db1bd
board-no-cards = Nessuna scheda
# en: 0463e9010e415ef45e74451772c13dbd858b5db4
board-n-cards = { $n ->
        [one] una scheda
        [many] { $n } di schede
       *[other] { $n } schede
    }
# en: ec6f345f456be5e906efb61c1bd7cc91fbe8c3d6
board-open-cards-in-spreadsheet = Apri le schede in un foglio di calcolo
# en: 4d4ce73b15660f20977ad7efab2283c51bdae008
board-card = Scheda
# en: 8ccf7349a24f44599bb594439759d55772afee20
board-lane = Colonna
# en: 19ccf26dc8e702d98d74975dc1be88ac35befe92
board-lane-options = Opzioni della colonna
# en: 7f51ca5da34a388508ed9fc5f8ac44c5562f5173
board-options-for-lane = Opzioni di { $lane }
# en: 5e8cce6827d0497950b63c967f9543df9fa8b1a4
board-add-card = Aggiungi una scheda
# en: 9b16c4bcc3877580d2535eb47b42650501308935
board-delete-lane = Elimina la colonna
# en: c0a3ef619ab093df30dca80bc872eedfe5850b52
board-move-to = Sposta in…
# en: 7b4bff0cec6d8f2a2abd46cfaa219d8214122ca1
board-rename-lane = Rinomina la colonna
# en: a5912ab4a43981f406eba8185371c4b3651e648b
board-card-in-lane-beside = La scheda accanto nella colonna precedente o successiva
# en: a200dd9231cf71181960586345e66a1b8bb3e738
board-move-card-to-lane-before-or = Sposta la scheda nella colonna precedente o successiva
# en: f801223b1d000f42a1e7f02ec5f078e77efbbea4
board-lane-name = Nome della colonna
# en: 4a1eabde691b377e61e564f2b21a56ce7c48f862
board-lane-needs-a-name = Una colonna deve avere un nome.
# en: f2eaf2b4b185176968749b50d7028a1c89357026
board-lane-name-taken = C’è già una colonna chiamata { $lane }.
# en: d1bef7e304cff6b5048ede1892d1cc9c4307b7fd
board-double-click-to-rename = Fai doppio clic per rinominare
# en: c6196faeecf27e09514f0812df5e4b0f18a49465
board-lane-total = Totale { $sum }
# en: d3f8f7b810c4b08f0b4ac4e47fdf8d265a10d869
board-yyyy-mm-dd = AAAA-MM-GG
# en: a0cb8ea4060e4a90b3f78592285740f7da401615
board-new-lane = Nuova colonna
# en: 8bd7cc004028fed2c431bef5632a5f52a14e1af6
board-title-of-card-n = Titolo della scheda { $n } in { $lane }
# en: bc2748da58d80b5c56727fe18421e38b112a5ae5
board-card-n-tap-chooses-it = Scheda { $n } in { $lane }: tocca per selezionare, trascina per spostare
# en: 810b76bb164a844386d1a2e79fd6f0580914a82f
board-chosen-cards = Schede selezionate
# en: 485f5f8bdd8f8be4ce2ca76e2531a5d8114df337
board-project-board = Bacheca di progetto
# en: c1781d58aa2f45b844d09310320a3910191ad880
board-to-do-doing-done-owner = Da fare, in corso e fatto, ogni attività con il responsabile e la scadenza.
# en: df5ed7c968260c1206d4e522066460822cf75b92
board-sales-pipeline = Pipeline di vendita
# en: e8005f76e068a5cac180467fb97ac33561c72f62
board-deals-from-inbound-to-won = Le trattative, dall’arrivo a vinta o persa, con il valore e la data di chiusura.
# en: 9ce5d6326186a71d12527fe2a55a6ba56518e0ef
board-hiring = Selezione del personale
# en: 9fe2a35ad36e6e3d1a54f763c65f2dabd3ad62f9
board-candidates-from-application-to-hire = I candidati, dalla candidatura all’assunzione, con il ruolo e il passo successivo.
# en: d52515f227f638ad6d968486abebc20d6729d8c6
board-content-calendar = Calendario editoriale
# en: 0f84e77fda32b99ff2b28eebd7adca162dcf5f93
board-pieces-from-idea-to-published = I contenuti, dall’idea alla pubblicazione, con il canale, l’autore e la data.
