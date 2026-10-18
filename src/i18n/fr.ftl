### Les chaînes de Tiny Little Office en français (France). Même format que en.ftl : l’identifiant, à gauche du « = », reste
### tel quel ; le message, à droite, est le français. Chaque { $variable } reste une fois ; un pluriel donne les trois formes
### du français ([one], [many], *[other]), { $n } étant le nombre. Vouvoiement ; guillemets français ; espace insécable
### avant « : », espace fine avant « ; ? ! ».

## the shell: header

# same
# en: 57f5f5efbc5990f5230aa95359042338b856707b
shell-menu = Menu
# en: 768e0c1c69573fb588f61f1308a015c11468e05f
common-title = Titre
# A new document of the app, and one not yet named; { $noun } is the app's noun: "New presentation".
# en: ef9b1a33245907a9a1d7b7c22053168ed660d014
common-new-noun = Nouveau : { $noun }
# en: bd2ce96ba3cfd14a4c62847d4e6bb0b8a3c72d25
common-untitled-noun = { $noun } sans titre
# en: a479c9c34e878d07b4d67a73a48f432ad7dc53c8
shell-download = Télécharger
# en: 33ce417454bfd838897deaeee2355e818a5d4160
shell-loading = Chargement…
# en: 22456f903bcbdedb06221ade9b87febb47722e40
shell-this-link-holds-something-that = Ce lien est illisible. Il a peut-être été coupé lors de la copie.
# en: 7dfd19fef00f41e899fb6e2753b71ae40ba59e6d
shell-n-of-max-link-characters = { $n } caractères de lien restants sur { $max }
# en: 51a6857d24b72bee0d1e541448d0f9c8fd5b8697
shell-n-characters-over-link-limit = { $n ->
        [one] { $n } caractère au-delà de la limite du lien
        [many] { $n } de caractères au-delà de la limite du lien
       *[other] { $n } caractères au-delà de la limite du lien
    }
# en: 1cfbe154225ecb3a01f463f1adde07279f1a454a
shell-n-characters-over-link-limit-short-link-holds-max = { $n } caractères au-delà de la limite du lien ; un lien court en contient { $max }
# en: e7722b7943884e579644a3f5bd2b605afd08a156
shell-n-characters-over-what-short = { $n } caractères de plus que ce que contient un lien court
# Before a document that lives nowhere but its link (Private, changed) is left for another place: the question and its three answers.
# en: f0bba930d38a38cacb48e472c8d4856caa4d8fa8
shell-this-document-lives-in-its = Ce document n’est pas enregistré
# en: 43454bfced276b8a1b83dea8a0bef1794a9bde60
shell-nothing-is-saved-on-this = Il n’existe que dans son lien. Copiez le lien pour le garder, ou enregistrez-le dans ce navigateur. Le bouton Retour vous y ramène aussi.
# en: e0ef0b02c240e569b52e799771dbb4fb07b35818
shell-copy-link-and-go = Copier le lien et partir
# en: fdb4eeef33355eb9aed9f11d6ddcdfe0c08a29ea
shell-turn-on-save-in-browser = Enregistrer dans le navigateur et partir
# en: 634bae7c8177155bc24961f3493f425b66e88c16
shell-go-without = Partir sans enregistrer
# en: ee7a39c93b7018b92bcff5511a92081df68dd3db
shell-save-in-browser-is-on = Enregistrer dans le navigateur est activé. Les documents que vous ouvrez sont enregistrés ici. Désactivez-le dans le menu.
# en: 97c669558589e3b0cf0917cb9caece8844ba65d9
shell-another-version = Une autre version enregistrée
# en: 87222e82bf5d208052c68fa66c93d131fa18fc67
shell-kept-on-this-device = Enregistré sur cet appareil
# en: 266695479a949eec44dea9db4e15fba00163f04e
shell-keyboard-shortcuts = Raccourcis clavier
# en: bc447a3151935ceff76e781c90fb02c45d25f004
shell-nothing-to-keep-yet = Rien à enregistrer pour l’instant
# en: 8c00f9130260156b1612126a7cf9a23bb3c553d6
shell-open-it = L’ouvrir
# en: ef6e207cc7cea57220ad9a73fc6040b0085bf63e
shell-save-in-browser-is-off = Enregistrer dans le navigateur est désactivé : rien n’est donc enregistré. Activez-le dans le menu.
# en: 3939d97295147954c5488340b1f427ebbfa51e69
shell-skip-to-apps = Aller aux applis
# en: 286b3810e407b3cef40b582c8ca4b373a58445bf
shell-skip-to-document = Aller au document
# en: 03d9aea1885137ab8ab4d9c24250515cb44161f0
shell-this-device-keeps-another-version = Une autre version de « { $title } » ({ $when }) est enregistrée sur cet appareil.
# en: 25c53c58cba7054a3a2ae9e9b575c7888716ae94
shell-this-link-was-made-by = Ce lien nécessite une version plus récente. Rechargez la page.

## the home page

# en: 276c9361fff15e60f48af4d733ec83315d2bb251
home-blank = Vierge
# en: f25b700ed9f092123a43acb205a6869342cf9dd6
common-templates = Modèles
# The button under an app's tile, naming the template list: "Start Text from"
# The list of an app's documents kept on this device, under its tile: "Write documents"
# en: c647789831582ba7f4b6aad72ea6f425b98aad6f
home-app-documents = Documents { $app }
# en: f6fdbe48dc54dd86f63097a03bd24094dedd713a
common-forget = Supprimer
# The button that forgets one kept document: "Forget Launch notes"
# en: bbc98cac8e5e1a213d5aa04b3618196a6d28bf49
home-forget-title = Supprimer { $title }
# Under an app's documents, the rest folded away: "3 more"
# en: 84ab0eecfadb6332ee8b1ee5c67852b7df54e66f
home-n-more = { $n } de plus
# en: 7f2352058be05faa9a191d7ac6eb2cf0a15b228f
home-aboard-project-made-with-respect = Un projet { $aboard }. Fait avec respect à New York.
# en: a26ce4e876668bb8cdbd6db05cc668d436b73ba6
home-beta-version = Version bêta
# en: 84add5b2952787581cb9a8851eef63d1ec75d22b
home-email = E-mail
# en: 5b5d9a510b8eb3d8ca42591036a5fb8c0402a674
home-templates-for-app = Modèles pour { $app }
# en: 5c88e1ec022720d6a2199c408f861dd61bfdbb08
home-app-templates = Modèles pour { $app }
# en: 5ea1c79be74b3d7c077d35212d473ca6fbd80c4a
home-templates-for-app-name = Modèles pour { $app } : { $name }
# en: 9b96d854dd8e79adb3ee6e1e0e419b50fc1aed43
home-templates-are-not-saved-in = Les modèles ne sont pas encore enregistrés dans ce navigateur. Connectez-vous à Internet pour les voir.
# en: 25d37d0580af5bc389b9332f3640f6d73ef93e48
home-documents-found = Documents trouvés
# en: 5e46670f6fe68987a7e5c94f03e192aff635df77
home-no-document-here-has-those = Aucun document ne correspond
# en: 1dfc2a61eb2345a48a2a91b7922b83f580553732
home-search-your-documents = Chercher dans vos documents
# en: 4f5fbd7fb6a16b16ebe3c347bf43c9a2455a1560
home-n-documents-found = { $n ->
        [one] { $n } document trouvé
        [many] { $n } de documents trouvés
       *[other] { $n } documents trouvés
    }

## the drawer (hamburger menu)

# same
# en: d9a36850b7f3f78365a998cb16cb68b6fd79400d
drawer-apps = Apps
# en: bbfa773e5a63a5ea58c9b6207e608ca0120e592a
common-close = Fermer
# en: d6cbbf296e77dd589e704c39eb4d6575d31a1d22
drawer-default-name = Par défaut : { $name }
# en: 1660227e6037ceaaaacebea7ba86a1f92071bd39
drawer-save-in-browser = Enregistrer dans le navigateur
# en: dd8082be77e9211f033a55131c1a6360f12b0e1d
drawer-what-is-this = Qu’est-ce que c’est ?
# en: fa7684f5e02290b9144d9d981add78ff873eb052
drawer-turn-on-to-save-files = Activez pour enregistrer des fichiers dans votre navigateur.
# en: af191ab94c0b2f93d5e90820805b9c7f419ce80d
drawer-turn-off-to-remove-all = Désactivez pour supprimer tous les fichiers et réglages.
# en: db5f691e51583d80782a9c51e78f01c49ccefd02
common-nothing-saved-in-this-browser = Rien n’est enregistré dans ce navigateur
# en: 15f47f2fab9454be9fab70ba4bd89293fdc40c0a
common-saving-in-this-browser = Enregistrement dans ce navigateur
# en: 5e543c55dd0832d9cbbdccc9e22011d240080e50
drawer-remove-all-files-and-settings = Supprimer tous les fichiers et réglages de ce navigateur ?
# en: 89b86ab0e66f527166d98df92ddbcf5416ed58f6
drawer-language = Langue
# en: a797e30923ac1be590300ce6b08e63b4e6dc6688
common-theme = Thème
# en: 15360c25a66578ad69e81e4c2fc3f0001e8a2258
drawer-match-device = Comme l’appareil
# en: a36ef8aba22905e2d2efbf1ac1d6230d5761859d
drawer-light = Clair
# en: ae1ef01432946b8976b9b58575b3390ab7644db2
drawer-dark = Sombre
# en: 6b21fb791ac05170893860c248401cd24a59b732
drawer-about = À propos
# en: 515e0d24040d094379cfdc94e3c6c2f63a26f1f6
common-tiny-little-office = Tout Petit Bureau
# en: 399d4aacd52f76ac8090ce08a31e550e2123645d
drawer-about-tiny-little-office = À propos de Tout Petit Bureau
# en: 6218d1c0ab69084ed45fb0f022b95f382310184a
drawer-tiny-little-office-is-experiment = Tout Petit Bureau est une expérience d’{ $aboard }, un cabinet de stratégie numérique et IA et de développement logiciel à New York.
# en: 04a1291dcc6e5d304f04516685710a331963f630
drawer-to-reach-out-with-questions = Pour toute question, { $email }.
# en: 522edc71559293b5713cff3f13c2dbafd37a56a3
drawer-email-us = écrivez-nous
# en: 98187f1688112fa57c00a326f526288fa3e6b023
drawer-if-you-find-bugs-please = Si vous trouvez des bugs, merci de les signaler dans notre { $github }.
# en: c6651994b242228b647fbbd2a83eccefd957abca
drawer-github-repository = dépôt GitHub
# en: 0fe421942f09b119f9019d2de286f5a43eefd4f3
drawer-all-of-these-notes-these = Toutes ces notes, ces dessins, ces phrases écrites au feutre s’effacent avec le temps. Seul l’éphémère dure.
# same
# en: 45efc495ed63ce777a86a3f8a9f4475269fb7542
drawer-eugene-ionesco-book = Eugène Ionesco, { $book }
# en: be1c21d6fe0ae49ef2cea2d317a4967da26d015c
drawer-discoveries = Découvertes
# same
# en: 687c82861c956e47456186f6522cfc8dbadb8ef6
drawer-documents = Documents
# en: a5c79e56eede8d4e922d461872629a01dd41ab77
drawer-find-app-template-or-command = Trouver une appli, un modèle ou une commande
# en: 45e5f3f72e961cb70134ba35f7a27a9620e515f7
drawer-commands = Commandes
# en: b993b0c537190bfc94b21360ac5abe51e56be36f
drawer-nothing-by-that-name = Aucun résultat
# en: 85773bc941e47b21f6cc345b225265e3144489be
drawer-add-to-home-screen = Ajouter à l’écran d’accueil
# same
# en: 9b3cbed5c490c07473546a88768ba29b787e9e52
drawer-size-of-everything = Zoom
# en: 943c5ac9fa7766d7c1ebecbc95c4e0d27b4ef9d4
drawer-to-add-tiny-little-office = Pour ajouter Tout Petit Bureau à l’écran d’accueil : Partager, puis Sur l’écran d’accueil.

## links that leave the site (kit/ui/link-guard.ts)

# The menu button's tooltip: the Office mark is the menu.
# en: 4a48e81d0d023913c2155eb30954f58853a5591d
leave-tiny-little-office-menu = Menu Tout Petit Bureau
# The question before a link that leaves the site: "You are leaving Tiny Little Office for" over the site's name, large.
# en: 92ad7c004fe14dea34666631ff31b016eb39ee40
leave-do-you-trust-this-link = Faites-vous confiance à ce lien ?
# en: 8d85feca3f164857fc84014a8f2ed5cc4846d4c9
leave-you-are-leaving-tiny-little = Vous quittez Tout Petit Bureau pour
# en: 50ef68d5c205237951dae42aa775a66480171c46
leave-this-link-writes-email-to = Ce lien écrit un e-mail à
# en: 102dce223fdc2f3bbdda71f28108e2a6fdf21710
leave-this-link-calls = Ce lien appelle le numéro
# en: afb8b3199e929e5e9f886fdf382599c9d440c71f
leave-not-secure-address-what-you = Adresse non sécurisée (HTTPS). Tout ce que vous envoyez pourrait être lu en chemin.
# en: 003e4888e77a22c782047c7d26d028c5eca46f1c
leave-whole-address = L’adresse complète :
# en: fdb31cf3fb383190c6864d4effd5fd6041b330cb
leave-someone-wrote-this-link-into = Ce lien a été ajouté par l’auteur du document. Le texte d’un lien peut différer de son adresse. Continuez seulement si vous lui faites confiance.
# en: 2e0b45f2a456e8db55f08d7b65e87593a3e9a140
leave-go = Aller
# en: c0f31f8a18b087fc577cbc50e9d37c68cb16c9ae
leave-links-of-this-kind-do = Ce type de lien ne peut pas être ouvert ici.
# About's last line, a link to the source of the build the site runs: "Running commit abc1234".
# en: 0eda2175601e6a4148c1c8b3f85c330bc7fbcabf
leave-running-commit-commit = Version { $commit } en service
# en: 45469d1ce86c199fb2984929d6c2e408178f7032
leave-this-link-hides-characters-in = L’adresse de ce lien contient des caractères cachés.

## the copy kept on the device (status lines under the switch)

## sharing: the Share dialog (kit/core/shell.ts), where the link fits (kit/share/limits.ts), the arrival banner

# en: 21697833514286cb120912c109ed55e870e44b01
share-copy-opened-in-new-tab = Une copie s’est ouverte dans un nouvel onglet
# en: ae7b279c96200b853008a352fa110ac2565f3dc5
share-edit-link = Lien d’édition
# en: 12355fc4c6eeb80306a7fe5199240b694bf2b85e
share-present-link = Lien de présentation
# en: bba41b4c62a01956942830c32fc1498945c30fcd
share-copy-into-new-document = Copier dans un nouveau document
# en: 2f84eea5d45da4f1ce1760b85db18a854f4e1b39
share-copy-link = Copier le lien
# en: 6e9d1ebfe7124caf277155d2f57b5a6787f30198
share-copy-of-title = Copie de { $title }
# en: 367f9cb75618d64b28286bdc4a5b8a3f4d7092f0
share-encrypted-here-service-holds-only = Chiffré dans votre navigateur. Notre serveur ne stocke que le lien chiffré et le supprime à son expiration.
# en: db4fb5a00a9a2172e9d45a362ff1b772884f64b5
share-expires-in-n-days-date = Expire dans { $n ->
        [one] { $n } jour
        [many] { $n } de jours
       *[other] { $n } jours
    } ({ $date })
# en: ae9d408cb75f0f6745c4a64cb802e6442cc299f4
share-expires-in-n-hours-date = Expire dans { $n ->
        [one] { $n } heure
        [many] { $n } d’heures
       *[other] { $n } heures
    } ({ $date })
# en: a202af448924971f4ffb4dc06ed405775781207e
share-expires-in-n-minutes-date = Expire dans { $n ->
        [one] { $n } minute
        [many] { $n } de minutes
       *[other] { $n } minutes
    } ({ $date })
# en: 0ef0475467d903f5adb0297bbc7979b7b0792d0c
share-opens-as-pages-to-read = S’ouvre en pages à lire
# en: 8744400a02796b44742f8f5e5b66216821eab90d
share-opens-in-editor = S’ouvre dans l’éditeur
# en: 7fbbb75c4e853ef0e42da5fe316344fdf1a6143c
common-whoever-opens-this-link-gets = Toute personne qui ouvre ce lien en reçoit sa propre copie. Ses modifications n’apparaîtront pas dans la vôtre. Demandez-lui de vous renvoyer son lien.
# en: 94b01acececc033463cc7731d659fbcae11c2b47
share-short-link-that-expires = Lien court qui expire
# en: fed3d23d480dd0bfe5a0cfff4d9f3dae7857fbe6
share-this-link-expires-in-n = Ce lien expire dans { $n ->
        [one] { $n } jour
        [many] { $n } de jours
       *[other] { $n } jours
    }
# en: 5f55ae03e19eebbbd3a277a7647d0b2ac27c4ec8
share-this-link-expires-in-n-hours = Ce lien expire dans { $n ->
        [one] { $n } heure
        [many] { $n } d’heures
       *[other] { $n } heures
    }
# en: a37642996477c73f2e3335a1e06a28d577806b52
share-this-link-expires-in-n-minutes = Ce lien expire dans { $n ->
        [one] { $n } minute
        [many] { $n } de minutes
       *[other] { $n } minutes
    }
# en: 04609a8df41f042b261ed7cf06b80c2667badd0e
share-this-link-n-characters-fits = Ce lien : { $n } caractères, tient dans un SMS
# en: 822e1dca627d6149b0263bdae6477ca56c62a36c
share-this-link-n-characters-too = Ce lien : { $n } caractères, trop long pour { $where }
# en: f9551d11c51a8da0015b0716e3aab327784b2ec2
share-discord-message = un message Discord
# en: 36dec9aa0b166bef869350675231f78529bbabd8
share-a-qr-code = un QR code
# en: 13be5551761c07ae1735af2e3fbcea08dae3dce3
share-link-in-google-docs = un lien dans Google Docs
# en: 66ab040bba28a1d3d5307879564a2bf9ff2ae108
share-telegram-message = un message Telegram
# en: aba5163784cd5c92d1a33174634785cace589ca8
share-a-short-link = un lien court
# en: c372595cddc6ae62ad3eb2ddfaa7cb6546e4df31
share-small-nfc-sticker = un petit autocollant NFC
# en: 7be07ec57c401332cca2718a0d4a6a516b77527f
share-text-message = un SMS
# en: 1efc6b2c2c837a8ce7a9054983d97158307b3c0e
share-chrome-and-edge = Chrome et Edge
# en: 777a1e3310cf18433544371b9f5422bf0ba0ac80
share-nfc-sticker = un autocollant NFC
# en: 219dd04dbbbc2c0867d0f2c748fdc25f6aba89f2
share-some-browsers = les anciens navigateurs
# en: 77437a6dfcf7562798d4a066e19fd698b357c1a8
share-n-short-links-kept-here = { $n ->
        [one] { $n } lien court conservé ici
        [many] { $n } de liens courts conservés ici
       *[other] { $n } liens courts conservés ici
    }
# en: fbdda8ea6ae4f71eb78a8bd78fa2746784806ffe
share-display-link = Lien d’affichage
# en: 54c374d4a68f528c4c4022d195a62e22b4bf57bb
share-opens = S’ouvre
# en: c2e98476efb5e35f50dae898c1b56d7085eee7da
share-link-copied = Lien copié
# en: 4dfbe46077fcd9769d6688a682515a0cf12a7d80
share-could-not-copy = Copie impossible
# en: 24897bc1ceb803cb3796e491bc10a252f16a950f
common-share = Partager…
# same
# en: abba02fcdd8b9ce1dde7f39b5b6aa0bd741f0d57
common-qr-code = QR code
# en: 7f8c79bef572d079a2e70de568104a605b4050cf
common-qr-code-of-this-document = QR code de ce document
# en: 5987984bd3953aa88448226f480b1c67ad98ab52
share-this-document-is-n-bytes = Ce document fait { $n } octets ; le plus grand QR code en contient { $max }. Raccourcissez-le de { $over } octets et il tiendra.
# en: 716ebea121ec7b8a4dd9ea47314131122cf0aab1
share-this-document-is-n-characters = Ce document fait { $n } caractères ; un lien court en contient { $max }. Raccourcissez-le de { $over } et il tiendra.
# en: ae5014875f1eec5203f8744323723d2ee679d1cc
share-expires-after = Expire après
# en: 1e1c72c2e33894ad38b820f1d4ed17ef478067be
share-hour = Une heure
# en: 4286c1f81faa848587ed38925e9b181e939f4998
share-day = Un jour
# en: 51e2a8b00255a6db1c49b306e7ac28f2e6ac9a23
share-week = Une semaine
# en: 6d17c3840dec7c16f42f223c4a5472efbbff08c1
share-month = Un mois
# en: 38c22f9dbdb41d2131b4324b7722c45a1f543420
share-make-short-link = Créer un lien court
# en: 94d7d8ee473f817fa4b57737e7a01ec3cd13d4d4
share-making = Création…
# en: 1c6c031b40782efe6b28678fc42d5569cc11e029
share-hundred-links-day-from-one = Limite atteinte : 100 liens courts par jour et par adresse. Réessayez demain.
# en: 0b5140c5b10a2b84301b5ef43056b7d89bd2187c
share-short-link-cannot-be-changed = Un lien court ne peut être ni modifié ni supprimé. Il expire automatiquement.
# en: 4d9182a72e391841c2817e9943cf2b07adf70220
share-could-not-shorten-link = Impossible de raccourcir le lien.
# en: 4c0067d6b6bd96cdab1ae363ce342312a93834fd
share-this-document-is-too-long = Ce document est trop long pour un lien court.
# en: a4d0b704a911979249dd2629e81a0205fab0aa44
share-up-to-hundred-links-day = Jusqu’à 100 liens courts par jour et par adresse.
# en: e963907dac5cd5c017869b4c96c18021c9bd058b
share-remove = Retirer
# en: d0517071aa376e797705058bbad4b658954b9930
common-link = Lien
# en: b15dbf0da72e08fcfcf35d2aed0a937335b9cc5e
common-short-link = Lien court
# en: 9095e39b9975250b05476c852d1631a6651924d9
share-new-noun-date-n = { $noun } { $date } #{ $n }
# Files, compare, posting and embedding: the agent and sharing surface.
# en: 1c2edb3104c7f2adce9ad2a77f3622d1beb0059a
share-mastodon-server-like-mastodon-social = Un serveur Mastodon, comme mastodon.social
# en: 64fbd995d3b6b156ee26ae3c03e6516434c34c12
share-change = Changer
# en: 2a07ce9a22d8e5dc1031e531518f04e50855319f
share-copy-embed-code = Copier le code d’intégration
# en: c3e1c83e5b4172d3c738e37cb69b76d93ce49b8b
share-copy-show-link = Copier le lien de présentation
# en: ad02e14e2841dfbd22ab2caa12b5541c5b01a53a
share-embed = Intégrer
# en: 4eeede7134d362f371fd18b2d63d3199bb24f01a
share-embed-code-copied = Code d’intégration copié
# en: 682cbb0f328f16ee213c6b44d7012512b55506b7
share-opens-deck-already-presenting = Ouvre la présentation directement en mode Présentation.
# en: 7858ac3ff63354f37161bd349efe11edd13b89cb
share-post = Publier
# en: c68fca11627c0ac342583c1782892518730cc40b
share-post-link = Publier le lien
# en: 82584c3ce64f57a310db6846c65628266a88c44d
share-show-preview-of-first-page = Afficher un aperçu de la première page
# en: ac1624e1fa626a4ba8b8ee419f0cf118d53fa480
share-picture-of-first-page-and = Une image de la première page et le titre restent lisibles sur notre serveur pendant un mois pour que le réseau puisse les récupérer. Le document lui-même, non.
# en: 6a46f4b4b3f001e64ef9652412aa1ddbdeabc489
share-shared-without-preview-reason = Partagé sans aperçu : { $reason }
# en: 4def5924266f682e91bcdff1e5ba510a20a36902
share-making-preview = Création de l’aperçu…
# en: b0e8d8d6d97acaeed4ad09f7b25699817638ae6b
share-page-could-not-be-drawn = la page n’a pas pu être dessinée
# en: b3dcb32d0d95afbd62938ff614915e68ba996861
share-picture-is-over-400-kb = l’image dépasse 400 Ko
# en: 398d796772eebe6fc3207881d76d2cf9f155da3f
share-server-could-not-be-reached = le serveur est injoignable
# en: 686fd096a5f35bcfbcdcc5130d1be03e593d7bfa
share-hundred-previews-day-from-one = cent aperçus par jour depuis une même adresse
# en: 959db3cd3ff1a424890a809f9cf7445f37db3289
share-server-refused-picture = le serveur a refusé l’image
# en: af490175b729a82a4315134642a89f1f87681967
share-pages-in-frame-on-another = Les pages, dans un cadre sur un autre site, avec un lien pour les ouvrir ici.
# en: 9377de06278eacbdf4a297a82b8eb9aa3d4220c0
share-your-mastodon-server = Votre serveur Mastodon
# en: fccb3597262f866e1c1f6a9f20bdd2439a0370b8
share-this-link-n-characters-n-bytes = Ce lien : { $n ->
        [one] { $n } caractère
        [many] { $n } de caractères
       *[other] { $n } caractères
    }, { $bytes ->
        [one] { $bytes } octet
        [many] { $bytes } d’octets
       *[other] { $bytes } octets
    }
# en: 525f61b6729229b1a8854a9e50bcaa52ea96b131
share-where = Où
# en: 55f653107f261dcc84be0568f5812694250f2e96
share-max-link-sizes = Tailles maximales du lien
# en: 24d948e4bdbe5b8224bbc0dfbab1923fab00b98e
share-limit = Limite
# en: f9f775ef8d81d0adcdb54a1de51a58a5ab9d24f6
share-fits = Tient ?
# en: 0e1a1a74c78e1f4b6e8efcb92b18aea677212d76
share-n-characters = { $n ->
        [one] { $n } caractère
        [many] { $n } de caractères
       *[other] { $n } caractères
    }
# en: 1991ca167949231900aa143e63134d2584d8de83
share-n-bytes = { $n ->
        [one] { $n } octet
        [many] { $n } d’octets
       *[other] { $n } octets
    }
# en: 36f6b0318377bb84249e4845275fa2c4e63ebb37
share-no-published-limit = Aucune publiée
# en: 5397e0583f14f6c88de06b1ef28f460a1fb5b0ae
share-yes = Oui
# en: f37d6e1b1ff2eeb01d7bee0aadef337300b9db53
share-yes-n-left = Oui, { $n } de marge
# en: 63dfcadd40126551301f363efd454c7d2c610b94
share-no-n-over = Non, { $n } en trop
# en: d2857acb2857d3f0021e0ffbcfc8730c9a6e2548
share-yes-counts-as-n-of-max = Oui, compte pour { $n } sur { $max }

## privacy (kit/share/privacy.ts, kit/ui/privacy-dialog.ts): the password, what the device holds

# The Share dialog's head line: "Created 9 Oct 2026, 14:03 · by Paul".
# en: 07fd5d289286fa4714b3f407db7875fac90b9952
privacy-anyone-with-link-will-need = Toute personne ayant le lien aura besoin du mot de passe pour l’ouvrir. Il ne peut pas être réinitialisé. Si vous le perdez, le document est perdu.
# en: 8c684290ce0b8a8e6cee79a145e17554064a4760
privacy-change-password = Changer le mot de passe
# en: 5be0d11b94b1ba25b2579314f6af69649a900cde
privacy-created-date = Créé le { $date }
# en: 39e64aebf907392389952dded5e20ab4836d876a
privacy-enter-password-to-open-this = Saisissez le mot de passe pour ouvrir ce document.
# en: 554393a215e479d023a30091a1394f7ca57690e1
privacy-forget-everything = Tout supprimer
# en: 715727cdd46f1bd0703c9e846fcdd4f369ef8313
privacy-preview-sent-with-link-to = Un aperçu envoyé avec un lien à un réseau est une image de la première page, le titre et les premiers mots, lisibles sur notre serveur pendant un mois. Le document lui-même n’y va jamais.
# en: a584ece11551d9b1a79856743236c51aba50c44f
privacy-forget-everything-this-site-keeps = Supprimer tout ce qui est enregistré dans ce navigateur et cesser d’enregistrer ? Vos documents existent toujours dans leurs liens.
# en: a798882f1c31099bb9500e2da62c0874d8dbed78
privacy-locked = Verrouillé
# en: a543040c9fee74b4b34282797abbf59e9d2c99b7
common-locked-document = Document verrouillé
# en: d850ee188c7c55b64bc3624534de5c5051a57dc6
privacy-new-password = Nouveau mot de passe
# en: 1851836868be57a15ca3684a090210f53c7a98f8
privacy-no-password = Pas de mot de passe
# en: 6eef6648406c333a4035cd5e60d0bf2ecf2606d7
privacy-none = Aucune
# en: b1b8530bbd687503cb5486e906942912fb68c231
privacy-opening = Ouverture…
# en: 8be3c943b1609fffbfc51aad666d0a04adf83c9d
common-password = Mot de passe
# en: 114bea5817640fe6b9eeec86b939ec0e9a7b6d76
privacy-password-removed = Mot de passe retiré
# en: ad1909e464528c140bf96a21ce9adda2464956c0
privacy-password-set-link-holds-only = Mot de passe défini. Le lien est maintenant chiffré.
# en: dce69146962b392ae2b157aec604eface36e90c0
privacy-password-ellipsis = Mot de passe…
# en: 9dfd349ebee555eb8d652be20dad971cae439eca
privacy-preferences = Préférences
# en: cf01481f626d5127ec7732fcbdb29504f08abefd
privacy-privacy = Confidentialité
# en: cefceeebf3cd6d02ddc7aca8c769881a5341e829
privacy-nothing-saved-in-this-browser = Rien n’est enregistré dans ce navigateur. Les éléments listés ne durent que le temps de cette visite.
# en: 626a605da9dbcd888eadcad13deebd3a64011c0a
privacy-protected-by-password = Protégé par un mot de passe
# en: acef17d00b9a1b6e1e15e76d27ae53635928a7a6
privacy-remove-password = Retirer le mot de passe
# en: 788f55b0957b15918c6aba279f4f0377a5a1db90
privacy-sealing = Chiffrement…
# en: 94408e41c12e924b82da7ea6e79e5cb69ac9e042
privacy-set-password = Définir le mot de passe
# en: f897cb67f049674308a073079bd85ad0649f8c82
privacy-short-links = Liens courts
# en: c706d94b54ef0b520420dd58063cfc78bc88c7e3
privacy-set-password-in-share = Définir un mot de passe, dans Partager
# en: e546afa59de2ec4b23ca6c4fafbaddac7bab9240
privacy-short-links-made-here-until = Les liens courts créés ici, jusqu’à leur expiration.
# en: b556bf027f9123d39581babef7e15564c24866da
privacy-their-names-and-links-for = Noms et liens, affichés sur la page d’accueil.
# en: 5300fdca86b5b32fd463f73704e318a2b8fa9961
privacy-theme-lifetime-of-short-links = Le thème et les réglages des liens courts.
# en: 0c6a2cfe53459957b6899930a2e5cd46b6541cec
privacy-this-document-has-password-link = Ce document a un mot de passe. Le lien, et tout lien court qui en est tiré, est chiffré.
# en: 0d21e52aba49ee4331213463b46c2ece33ad3cf4
common-this-document-is-locked = Ce document est verrouillé
# en: 1dc606b1828a1e2f5bbbed9ed30fa3a80712e3d8
privacy-this-document-is-locked-with = Ce document est verrouillé par un mot de passe.
# en: 1526a17ee7570e6235eb76a6fef8ce4b6d9a3486
privacy-unlock = Déverrouiller
# en: 887b0828ec99930408eb32249f1209057b1b234c
common-unlock-ellipsis = Déverrouiller…
# en: ce3661a255464b1b22e6f395685d0e6f9fa077da
privacy-what-this-device-holds = Stocké sur cet appareil
# en: 8485be9e7b3e998c5f1eef5ce87d2aa67726e3cb
privacy-your-documents = Vos documents
# en: d21905a9907932f7976e1ca96129c0af871f2715
privacy-your-browsers-history = L’historique de votre navigateur
# en: cdff70e571d4ed7aeb1a43cedaf33299bdcd258e
privacy-every-document-opened-here-in = Chaque document que vous ouvrez, en entier, sauf s’il a un mot de passe.
# en: 18b8a03ed6567555edd5005aab5b090984f4b5bd
privacy-not-ours-to-clear = Nous ne pouvons pas effacer ceci
# en: 3ca2d1d26637d42b974b313bb8ce231333179a9e
privacy-by-name = par { $name }
# en: a9e72cf83916d4381012a19b329292818f845a43
common-n-documents = { $n ->
        [one] { $n } document
        [many] { $n } de documents
       *[other] { $n } documents
    }
# en: 1a8f1553a9832c92927784f88f31a89cd991e803
privacy-n-links = { $n ->
        [one] { $n } lien
        [many] { $n } de liens
       *[other] { $n } liens
    }
# en: 2ddd4097832d991c46023732a889beeb8ec4c29d
privacy-n-set = { $n } définies
# en: a97ce1edde4ad396d1cff34063087d0bf5d0e1a8
privacy-copy-this-and-send-it = Copiez ce mot de passe et envoyez-le séparément du lien. Il ne sera plus affiché.
# en: 7640428ae16fc2b673d689ddf6b1ea15eed407d3
privacy-make-another = En créer un autre
# en: 9a0081f0b2bff82fac1961a403734134b9a3b170
privacy-password-copied = Mot de passe copié

## a document locked with a password, placed inside another (kit/share/locked.ts, kit/ui/locked-doc.ts)

# The card drawn where it sits; { $app } is the app's name: "A Spreadsheet document, locked with a password".
# en: db4307e70c2d2722c2af2f79643b28e73325e9be
common-with-password = Verrouillé par un mot de passe
# en: fa27fac915c0c87aec9006392ae6422f59857f5d
locked-app-document-locked-with-password = Un document { $app }, verrouillé par un mot de passe
# en: 49db1d83c8636baba474ad11626b5a7c5260976f
locked-with-password-unlock = Verrouillé par un mot de passe. Déverrouiller…
# en: 507e778ae244911abcb05b73967febd0edb425a5
locked-document-locked-with-password = Un document verrouillé par un mot de passe
# What one of them is called in running text, as an app's noun is.
# en: 78ed9fb58f4437d5d29cf78ba699a560017abe47
locked-document = document verrouillé
# A placed document whose link cannot be read (cut short when it was copied).
# en: 0c45986cb6755e463398a592a861baaf44018954
locked-this-document-cannot-be-read = Ce document ne peut pas être lu.
# en: a2a127edeb3eed5dc264fc299b034db6493e1636
locked-that-password-does-not-open = Ce mot de passe n’ouvre pas ce lien. Si vous êtes sûr qu’il est correct, le lien a peut-être été coupé lors de la copie. Redemandez-le, ou demandez un lien court.

## words several apps share

# A menu of what can be done to the document as a whole (the Presentation Builder's submenu).
# en: 6e16ec256749730ccec984c8efeb7804db5b9737
common-this-document = Ce document
# { $task } is the task's words.
# en: 15f18f71eefc9fedc6fedd434c2edc6a919bf130
common-done-task = Fait : { $task }
# en: 00c65041972e0368c2c8b452d60c0a0754fcc9bd
common-drag-to-move-tap-to = Glissez pour déplacer, touchez pour sélectionner
# en: 525df57dc3610e74377113b92951476bb9387e4d
common-move-left = Vers la gauche
# en: 3a43e56f34dece6eb3d79dee1eff7b2f87db6040
common-move-right = Vers la droite
# The group heading the Calendar and the Trip Planner sit under on the home page.
# en: ae2f98a099fe5855c31126233e9c13641ee7fdba
common-plan = Planifier
# en: 9985434cd07212b8dac01f8e015a1fa8adac9a99
common-chosen-tasks = Tâches sélectionnées
# A link that opens the document (kit/ui/compare.ts).
# en: cf9b77061f7b3126b49d50a6fa68f7ca8c26b7a3
common-open = Ouvrir
# en: 7bb0ddf9221c03b806b03c209e8366000124aa15
common-task = Tâche
# en: 090ec5f560fc50377fcd95e5cda128e91b276e98
common-tasks = Tâches
# en: 1835508670fb85faefa88cd88d4f57d3cdb00716
common-find-app-doc-template-or = Trouver une appli, un document, un modèle ou une commande
# en: 0d47323c5ee8dde30a5ca28f6ed6103d42081b97
common-in-this-document = Chercher dans ce document
# en: 733a5f2fb910bb704c7993cae3d8224558d405de
common-indent-or-bring-out-in = Indenter ou désindenter un élément de liste ; cellule suivante dans un tableau
# en: bf6e36633c2362cb7fa31a0e8f833388a49ba28c
common-move-selected-items-up-or = Monter ou descendre les éléments sélectionnés
# en: 989fe994e413c509c03d3dd229b775a3ddc4707b
common-nudge-shapes-in-hand = Décaler les formes sélectionnées
# en: b11d72438f1b00b65769e9b8597829583dc4d631
common-select-all-words-of-box = Tout sélectionner (ce champ d’abord, puis tout le document)
# en: be76d0b25853b431767ca5b5d57ef569bbc6ff2a
common-back-to-words = Retour au texte
# en: 0c0b01d469faff60dc3b2d1c035ee0a7caa03852
common-extend-selection = Étendre la sélection
# en: 11a8a25332234992a14424d8aad6fb9ce3d3b287
common-next-or-one-before = Suivant ou précédent
# en: b4365b2ed2016713788d08335e5157985010ac28
common-step-out-close-collapse-let = Fermer ou désélectionner
# en: fb2997642419cda8393061543f140d40a9323957
common-check-or-uncheck-task = Cocher ou décocher une tâche
# en: 0a4adf12f01d48ecdb89f5eddf5f19fd89d94522
common-too-long-for-qr-code = Trop long pour un QR code : raccourcissez le document, ou partagez un lien court.
# en: 1e14a1c5e931f6ef8ce8378377366f3c68cef56c
common-n-of-count = { $n } sur { $count }

## downloads

# en: 5b221e9c2a451799d8f37e2b9874409d5e03ab05
download-print = Imprimer
# en: f304fc6dd3e87a37a6c53cb62344c10a789a7ad9
common-print-or-save-as-pdf = Imprimer, ou enregistrer en PDF
# en: 473b3126e859286ef98d231328fa11a3216823a1
download-picture-png = Image (PNG)
# en: 3ad1b6c4e3dcf07e9ac0c95d5303f7ca4f89e55e
common-web-page-html = Page web (HTML)
# en: 1ba61ab4dec3fa0358c9ed0c77d6ac46f598a1f2
download-text-tlo = Texte (TLO)
# en: 840a0fda84379bffc2a266a92bbb990672a7c8d2
download-data-json = Données (JSON)
# en: f77017c03d9d2be93a74ef7ef7e099dd77976f01
download-downloaded-name = { $name } téléchargé
# en: 01125e1be1f56cdaa47c6314a158e1219af819b3
download-failed = Échec du téléchargement
# en: e7f6a6728b280414756d238ae70084720018ba47
common-open-in-tiny-little-office = Ouvrir dans Tout Petit Bureau
# Under a document cut off at a slide's foot: a link that opens it whole, in its own app.
# en: c510d6c04c0951500c8e43f623e9f8886c378aec
download-see-more = Voir plus

## the bar, shared by every app

# en: 95802daab3a23990338179f72248350c1434cf39
common-insert = Insérer
# en: 19e07430eed6d97d6d73cb4a2967b1f316520f54
bar-bold = Gras
# en: 1616e2e5405e69c4e3914c67c644a9bd3ac00956
bar-italic = Italique
# en: 39773aa3efa19090c918baedac1fe737dea25b92
bar-underline = Souligné
# en: a93b9a6808a95ca93515164188159659017155cb
bar-strikethrough = Barré
# en: e1da9275bc5b420601738531d5e4445b44e0e6e9
bar-highlight = Surligner
# en: a3089b7fae27bca3309070e0487079a25b8f1ede
bar-heading = Titre
# en: dd870cfcae5fa76d524491679a57b27d41ffb462
bar-bulleted-list = Liste à puces
# en: 8294ea4f78d097513144a9b8ba4e6d545a2a19e1
bar-numbered-list = Liste numérotée
# en: 0424f6e7026fa4bc2c4a7043083417315113c79b
common-table = Tableau
# en: 40e31a210a1913fd0a8b28b892780996d154c70d
bar-footnote = Note de bas de page
# same
# en: eb9a4bc1c0c153e4e4b042a79113b815b7e3021d
common-date = Date
# en: 39fc72124884d6573e4f9f89585f071ed0782696
bar-undo = Annuler
# en: 471b94d402d16a5fe7549d001a68ada1f7ddb16f
bar-redo = Rétablir
# en: 24345a14377fd821d3932f4e82f6431640955b0b
common-today = Aujourd’hui

## the editor (<to-text>): chips, cards and the bubbles

# A footnote's mark, and its words where the notes are drawn, by its number: spoken.
# en: f91f3abb5afff1229edcc701ea915aadef98aca8
common-footnote-n = Note de bas de page { $n }
# A card standing for another document held in this one, of a kind no app here reads: "abc document".
# en: ae6aebc074024e9de875113693a49f1e19bf555f
common-app-document = Document { $app }
# The same card when its app is known; { $noun } is the app's noun: "A spreadsheet".
# en: 3f77d60418ea2f6a04196c1e67715b3007390e77
common-noun = Document : { $noun }
# same
# en: adac69379a626c2436948a4ef1792c7d719ef929
editor-code = Code
# en: 6512ee1541e9a6c52d5bf7cf465332e8df25ea3c
editor-connection = Liaison
# en: 86ccb2898e6f07a6967cf007c54e365e26ba776c
editor-n-rows = { $n ->
        [one] { $n } ligne
        [many] { $n } de lignes
       *[other] { $n } lignes
    }
# en: 221e4b1822bb3e80534c57d63a89d0f58d85c77b
editor-notes-words = Texte de la note
# en: e9b450d14bc2363d292c84f17cfad5cfbd58a458
common-done = Terminé
# en: d70f93df5e8f9b55be44fbeee9d203972e3383d4
editor-address = Adresse
# en: 74d3b25667541c75d79e0558305f4bda62229bd7
editor-not-address = Pas une adresse
# en: c8648f259049ce8bdb49529963c37a97f75e8d4b
editor-set-link = Définir le lien
# en: d2de1a2831e7fee28d6c8d214b66da0d1bed30c8
editor-open-link = Ouvrir le lien
# en: f377ac75602950b2c36449de5bceb3c12333ac77
editor-change-link = Modifier le lien
# en: 8d48d1f9e74c4fecd89a67645ca3593ef0964710
editor-remove-link = Retirer le lien
# The selection bubble's name: what can be done to the words selected.
# same
# en: 041a5dec481d6bf0724caeaa84bc135d7d9062d4
common-format = Format
# en: e5fd9cfe0e8039111d54b588e77b2bb0cad41c3a
editor-done-lowercase = fait
# en: 4ed7199b77561b7a7c013f7a8504b6686496302d
editor-not-done = à faire
# en: 984cfca8d70e0b1e37a9e70c98a219bb12a05f23
editor-bold-italic-and-links = Gras, italique et liens
# en: a983f10d71bb808f58795f6ae728a6e76f08ce78
editor-one-of-words-column-holds = Un des mots que contient la colonne, ou un nouveau
# same
# en: e31d972229de381b461860014dd710856361917a
editor-option = Option
# en: eb883fb88ed57f39b760fee6ee8f5a04a8cdc7ba
editor-this-browser-lets-page-paste = Ce navigateur ne permet de coller qu’au clavier ou par le menu Coller.

## the example in the kit's own documentation

# en: a76d4605993fe042c6e171382b1fba057fa31ff7
example-n-slides = { $n ->
        [one] { $n } diapositive
        [many] { $n } de diapositives
       *[other] { $n } diapositives
    }

## the Word Processor

# en: e8e834c4d268a3032b26958914d01ef0addf080e
common-word-processor = Traitement de texte
# What one of its documents is called, in running text: "Untitled document"; each app's noun is in its section.
# same
# en: 4f8278c89ad16da05fec4fdfc61fe44798b92720
write-document-lowercase = document
# The group heading the Word Processor sits under on the home page.
# en: d26d55c7f815c82cf430c3915b3bb833d3f02e5e
common-words = Texte
# en: 703864836e29b00a7c7490f714fd2d18474de840
write-words-on-page-headings-lists = Des mots sur une page : titres, listes, liens et notes, un tableau qui calcule, imprimé en Letter ou en A4.
# same
# en: e214b8a29923056887b7edf6635d90dcbb2abe88
write-document = Document
# en: 6e660ac1c8b81a53e302f6bb0298551ec820eceb
write-here = Écrivez ici.
# en: 6b8ad00f4398c3aa47f82637d019dad9e4f9da0c
write-subheading = Sous-titre
# en: 05058e0b630498611ebc41894f7b1670dcd5870e
write-paragraph = Paragraphe
# en: b4d812c8bee8056808c14f1b31b6765342c8437e
common-bring-out = Désindenter
# en: aacf42132cce6cf5c1608a5d27f90fcbf93ae851
common-indent = Indenter
# en: c83b0ec2d98a2ca38077be2f03102aedeb0ab261
write-align = Aligner
# en: b442b455b6a5e55f249769068c3fcc4832aea89d
write-align-left = À gauche
# en: a2391118c8141b7f016207cb0da015ce9b3323e4
write-center = Centré
# en: 9bb446b31da260be7a0206a0e15270eb6bf47255
write-align-right = À droite
# en: 536d2746f7f2f88df35515a9cd5e44cb1582b9ca
write-justify = Justifié
# en: 2ed7f99f153a2a3dd123644137db651eb191b2b2
write-paper-paper = Papier : { $paper }
# The Look menu: each look's name, then a line about it drawn in its own type.
# en: c1ccf83eea101ddafb5de4e3dea5f3693ae473c0
write-sans = Sans serif
# en: 2fa97b3a9a6621a3a887ef5686bf4604fa6804e6
write-clean-and-plain-throughout = Net et simple partout
# en: 56632c1841ab67cf1e7c7179b9c5ea0e32ea81c1
write-bookish-serif-throughout = Une police à empattements, façon livre
# en: 7daed9b46fb34186159d19a2dca5208daf510f54
write-monospace-ragged-right = Chasse fixe, non justifié
# en: 9ec6ab25de9a050b550600a98c5a63e5b2c00bf8
write-serif-and-sans = Serif et sans serif
# en: b3ca8ebc46d597ea38c5f4877cf7ae7bfb4e3d68
write-serif-headings-sans-text = Titres en serif, texte en sans serif
# en: e0c6a397d49350373ed4d55573e9365c212631bc
write-sans-and-serif = Sans serif et serif
# en: d9d9d24d3963e4acfa41725ddd5a228f70b0869f
write-sans-headings-serif-text = Titres en sans serif, texte en serif
# en: f69f233005f15802770fd26fbf7ead52ec13d9e6
write-book = Livre
# en: d242210a93b0f91c16b76df2eaf8efc7ae211585
write-justified-indented-small-caps = Justifié, alinéas, petites capitales
# en: 5ebe6500747dd5dbad08cc1b33d55fac89ccbe97
write-newspaper = Journal
# en: ed0ae2181b2137e6b9f63fdbaeed415ac7e73502
write-narrow-headline-two-columns = Un titre étroit, deux colonnes
# en: 62fb6cfda0506f0ed73ad066151086d3eed2296d
write-horizontal-rule = Ligne horizontale
# Insert ▾'s rule in a document: what follows starts the next page.
# en: 830b8871f026d13b7b94d6723471f2b4e152e360
write-page-break = Saut de page
# same
# en: 9ce3bd4224c8c1780db56b4125ecf3f24bf748b7
common-ok = OK
# en: f2dc2c1e1465864ffbc4e8100c86cfeeafc4fffe
write-this-card = Cette carte
# en: 1e06557fc0660e50a99fa6eef90bff822411e3ae
write-open-in-app = Ouvrir dans { $app }
# en: 108add9c9b3eed03ee5eb57783d780a485840218
write-locked-worked-out-for-you = Verrouillé : calculé
# en: ec0c3b76630fd745381cc215a284820af75a683a
common-footnotes = Notes de bas de page
# en: 5c71d5f47999af43b0a80e72abd8e5b79e736f80
write-back-to-footnote-n-in = Retour à la note { $n } dans le texte
# en: 6bc94b9eb554810d980ae7fb5673badbbb0b531c
write-back-to-text = Retour au texte
# en: be51f46400fec04e375ba1ea35d98d05b69a1a2e
write-n-words = { $n ->
        [one] { $n } mot
        [many] { $n } de mots
       *[other] { $n } mots
    }
# same
# en: 71d562b7d96e16456a25e7230f3bc08bb796552a
write-word-docx = Word (DOCX)
# same
# en: 23e67fceae0d77dd571dd25695fc0499faf1bb77
common-markdown = Markdown
# en: d50fcd6f846a2616a90ec5dd1f67488a993c2743
write-rich-text-rtf = Texte enrichi (RTF)
# A table in the text: its heads, its handle, its column menu.
# en: f4344253d823d09db13bc3877d37c9618588506a
write-add-column-before = Ajouter une colonne avant
# en: 9b3acfc74a5d37d699868ade0ed3d142024174cf
write-column-c-what-it-holds = Colonne { $c } : type, nom, ajouter ou retirer
# en: 1f01479a40aa348fc273d4d09636403f89eff717
write-table-move-copy-or-take = Tableau : déplacer, copier ou supprimer
# The templates
# en: cfd76febbb671e54b2f280128fb5c317389758a7
write-a-letter = Une lettre
# en: 7456f1ce5f81c497b66302751f617f60612306f6
write-your-address-date-greeting-point = Votre adresse, la date, la formule d’appel, le sujet, la formule de politesse.
# en: ae3cd6584a49de52c70c1e00ae0a02c8abab166b
write-meeting-notes = Notes de réunion
# en: 7bbe470d4a5d9510c0fcb6844b519d118681beb7
write-agenda-what-was-said-what = L’ordre du jour, ce qui a été dit, ce qui a été décidé, qui fait quoi.
# en: 9fb58963c66db0c8ca7c638f491e82246e226d30
write-resume = CV
# en: 3f3c7baad1c18a4ab23412f60d65b5179346006d
write-name-and-contact-experience-education = Nom et coordonnées, expérience, formation, compétences : un CV qui tient sur une page.
# en: 5a0ba3bb83f0992ba00ae94db6a7464210c40711
write-contract = Contrat
# en: 50899f480b3395ee509689b06672ad9d8719e082
write-plain-words-agreement-what-each = Un accord en termes simples : ce que fait chacun, et comment il prend fin.
# en: f9f38818c406d0878defb17a2356e1a2c658861a
write-invoice = Facture
# en: 4e056cf73efd0995ce1e7c5fd88900894935896c
write-who-what-and-how-much = Qui, quoi et combien, les totaux calculés dans le tableau ; à imprimer et à envoyer.
# en: 80c40a5c8be53118fd8a9fc487b43f20c3014fbc
write-cover-letter = Lettre de motivation
# en: fe727759e1b85df4a1d71348a1a6dfd6ef8e135d
write-applying-for-job-position-what = Postuler à un emploi : le poste, ce que vous avez fait, pourquoi eux, en quatre courts paragraphes.
# en: 1fd79b9555ddf59862d60aa0aa3bb74fb74aae78
write-memo = Note de service
# en: cfa5a189ad757d015661acb500917a198d8a13e1
write-to-from-date-and-subject = Destinataire, expéditeur, date et objet ; le changement en une phrase, pourquoi, et ce qu’il vous faut en retour.
# en: 092f99ea11a34a8490e7a767a83a42fc45634f82
write-minutes = Procès-verbal
# en: 34dbbbeddd62f120a000701c56adebc8bae95352
write-formal-meeting-who-came-treasurers = Une réunion formelle : qui est venu, les comptes du trésorier, une motion et son vote, les actions.
# en: e04a25d1f69061bfe7770b16891fca2c413bcbe0
write-one-page-cv = CV d’une page
# en: 11628c83c5de19d1338628ed7153b648f496b27c
write-typewriter-set-cv-now-before = Un CV façon machine à écrire : aujourd’hui, avant, formation, langues et outils.
# en: 6ed05e720ccc3ef269db1b38201da8b873acc895
write-newsletter = Lettre d’information
# en: e583899cf44dbc07e6d8d4e7a252d39552e4e3d4
write-block-associations-month-dates-in = Le mois d’une association de quartier : les dates dans un tableau, les bienvenues, les nouvelles et les remerciements.
# en: 1dcda804c96da3cc7e73e8a1672d4379a741f11a
write-recipe = Recette
# en: 72490fa559ee9ce5ed498b58b3e2cad900af7155
write-what-you-need-in-table = Ce qu’il faut, dans un tableau qui passe de quatre à six personnes, puis comment faire, pas à pas.
# en: aa3ddab4d749b73414ddd65201f9c6553b98a49b
write-questions-and-answers = Questions et réponses
# en: 1854b96dd11603bed03cce723369ef661a6f34f8
write-questions-people-ask-each-heading = Les questions que les gens posent, chacune en titre avec sa réponse dessous.
# en: 6d234a17fecd5048e790eb4d1c415e17899a0e56
write-press-release = Communiqué de presse
# en: ba41d12bbba317bcacf230155abba7ce9e400379
write-news-in-first-line-detail = La nouvelle dès la première ligne, le détail, une citation, les horaires, et qui contacter.
# en: 0c30f8a886ae8207e0702b4daf5eda405b19a131
write-news-article = Article de presse
# en: 66280b179ec208e759c8fd7e05a4b1171c355c9f
write-headline-byline-story-in-two = Un titre, une signature, l’article sur deux colonnes sur papier, et un graphique des chiffres.
# en: 19ad8ec7231e0cc9d9ea7e0684742672018e1f05
write-interview = Entretien
# en: a8d0cc9ab05d2f4925e897a47c9c9554e289fb4e
write-introduction-then-questions-and-answers = Une introduction, puis questions et réponses, chaque intervenant nommé.
# en: 94a18e60341a34b6feec02442ec2d70ee1244900
write-book-review = Critique de livre
# en: a8ccbb45148f664a9800e533e32902524ce8217a
write-book-stars-what-it-is = Le livre, les étoiles, de quoi il parle, ce qui a marché et ce qui n’a pas marché.
# en: 1eb36cb79b31a29c161965efdbb310289b4e5814
write-music-review = Critique musicale
# en: 75857043416829c78af6afbfcd886ea90847e06c
write-album-label-and-length-stars = Un album : le label et la durée, les étoiles, les morceaux, les meilleurs titres.
# en: fae48a8f67fd81fb5d54b5a9c2d60929cd5da2f7
write-thesis = Thèse
# en: 8dd8017f140560c80229f7d051a8fb2376183e9a
write-title-page-abstract-chapters-with = Page de titre, résumé, chapitres avec notes de bas de page et un tableau, et une bibliographie, composés comme un livre.
# en: 42921f1b739a62eb82bc6f16ce47ff5ce5fd4da4
write-grant-proposal = Demande de subvention
# en: 381d823ac8ecdff832331120748c151a113b2464
write-ask-need-plan-budget-that = La demande, le besoin, le plan, un budget qui tombe juste, et comment vous saurez que ça a marché.
# en: 1b731d688386e2e229d1c2b671e96c2bfce768a4
write-syllabus = Programme de cours
# en: fc9a91d648763f9cd04a596f372b833e76f709f8
write-course-when-and-where-what = Un cours : quand et où, de quoi il parle, les semaines, et des notes qui font 100 %.
# en: 3c847b9cd456626c998b9d2793f7701117ee4c80
write-formal-complaint = Réclamation
# en: f98daa2b60c626279045f82029a9e58dfcd90f4b
write-what-happened-in-order-what = Ce qui s’est passé, dans l’ordre ; ce que vous voulez ; et pour quand, avant d’aller plus loin.
# en: f74c6bc075b1961f73f45729ce6281dc84fb3ccf
write-letter-to-politician = Lettre à un élu
# en: 2e754026e13e7ebe41d9513e31f94d8268341243
write-ask-your-representative-for-vote = Demandez à votre élu de voter : qui vous êtes, pourquoi cela compte ici, et une question.
# en: de21096f37522d15740e7a4acd69efc811f9b5ce
write-love-letter = Lettre d’amour
# en: a6977a11c96b06575fd8359e1bb9e3dea5a21fcf
write-ordinary-things-missed-letter-across = Les choses ordinaires qui manquent : une lettre par-delà la distance, en serif.
# en: 1af339528a1814a5f1dc409f2d108e0308035b87
write-wedding-speech = Discours de mariage
# en: b040a94a7bd386ebaee15aa4c4535da004fadc4c
write-how-they-met-what-you = Comment ils se sont rencontrés, ce que vous avez vu depuis, un mot pour chacun, et le toast.
# en: c88c994e6c6c50db17576753df90aac55138155f
write-eulogy = Éloge funèbre
# en: cdc87e623e95678f786543dd272ba279df15e8ee
write-life-in-few-minutes-where = Une vie en quelques minutes : où elle a commencé, qui il ou elle était, ce qui vous manquera.
# en: 6c63ce6d4727a3fb46c16a62ac8d536b0b61fd08
write-zine-essay = Essai pour zine
# en: ecce024c73aadb2150552b3419d5aa1c3cb72c17
write-personal-essay-for-small-magazine = Un essai personnel pour un petit magazine, tapé à la machine.
# en: 563a631aba8690962836c99d15886672eb96ef62
write-petition = Pétition
# en: 6d3ace089783eb6cf5e5fe47a7d74a3ee5c21f39
write-what-you-ask-why-and = Ce que vous demandez, pourquoi, et les noms de celles et ceux qui sont d’accord.
# en: a6a1d25b018c9318540556e3fe374fdf8b23aff8
write-terms-of-service = Conditions d’utilisation
# en: 79b220d914e24eb7ac79428e72639e8547d8ab9a
write-small-businesss-terms-in-plain = Les conditions d’un petit commerce en termes simples : réservation, prix, clés, imprévus, résiliation.
# en: fe3b114dccf2739f949d65ac4101037eb8f92543
write-open-as-outline = Ouvrir en plan
# same
# en: de69a629f9c30af3f481110f0f42a7c0c5efacfb
write-a4 = A4
# en: ee14050617b7b58e17aabccd61c241ccdafc6379
write-letter = Lettre US
# en: c036e85b63c6818f6732a2898cf85f30f8074bfb
write-name-this-column = Nommer cette colonne

## Insert's dialog (kit/ui/insert-dialogs.ts): Tiny Little Office Doc

# en: d5674bb4dcb8c5fe378eb9cd0bb9d1849ed37581
insert-tiny-little-office-link = Un lien Tout Petit Bureau
# en: cdea71ff947c2b49dd7d7ea146fd3efeb9fa5677
insert-opening-short-link = Ouverture du lien court…
# en: 9d2d34c4b04d8410e0025beb7899a31d1bc57c04
insert-paste-link-of-another-tiny = Collez le lien d’un autre document Tout Petit Bureau, long ou court : sa première page s’affiche ici.
# en: 7e4861cdc8de2c0c4cf87ca37c9130a92051b5b0
insert-this-is-not-tiny-little = Ce n’est pas un lien Tout Petit Bureau, ou il a expiré.
# en: 1eb05dc15f4e90a6a61c46b111812e974555cd81
insert-tiny-little-office-doc = Document Tout Petit Bureau
# en: 7bb236efe4e244196e506d65542626cfe368bb09
common-tiny-little-office-doc-ellipsis = Document Tout Petit Bureau…
# Insert ▾'s group of the apps a new document can be made in, inside this one.
# en: f9f93f3f14cfa3eea1bfcfee97ae22cd15b25e0d
common-new-document = Un nouveau document

## another document edited in place (kit/ui/doc-dialog.ts); a table's size is Rows × Columns

# en: 77dfd2135f4db726c47299bb55be26f7f4525a46
common-cancel = Annuler
# en: 52d0b35277ee4b2b66ec4016620c658d99c7b57a
doc-rows = Lignes

## charts (kit/draw/chart.ts)

# en: 7b6451ab3171ebc15cd43dfe0d80c1a0062c902e
chart-empty-chart = Un graphique vide
# en: ad5fb3b6084bf40286ee5437a7f894e0088a499d
chart-bars = Barres
# en: eb911036281c4d6d5c0b067a7951e39b0aca7b63
chart-flows-sankey = Flux (Sankey)
# en: ecbdb15a7119ffa05cdc38ee38e20c129e28a8bc
chart-flows-list = Flux : { $list }.
# en: c6fd3870c86e7422a0146e1e2a052437fb8e51e2
common-lines = Courbes
# en: 5a2f5ac996eef952d239a22e8d68296faf975994
chart-nothing-to-chart-yet = Rien à tracer pour l’instant
# en: 7631740b7c7b5a09ad168ae28580b5c9ca4b8c06
chart-nothing-to-chart-yet-rows = Rien à tracer pour l’instant : des lignes De | À | Montant
# en: 9318d4f63aeffddc47d4520c722ad70f0ec6c63a
chart-pie = Camembert
# en: 40c20d94e78fa142819df8cc9440d30e65329975
chart-series = Séries
# en: 79b2c4ce6295c191bf1031160055f59fb8174174
chart-kind-chart-data = Graphique : { $kind }. { $data }

## the Spreadsheet

# en: 12acc4f41c4ad8ed5996ac33a2f066e024ba1c65
sheet-clear-these-cells = Effacer les cellules
# en: c527ea0aeba3f2d0104802279fed7e595157b78e
sheet-fit-this-column-to-its = Ajuster la colonne à son texte
# en: b92fe41ac34453cd0368f0fa5d00d1e9b0279c12
sheet-cells-in-hand = Cellules sélectionnées
# en: 119faf17cd1de268ce34ade4f9bae4520774f640
sheet-check-ref = Cocher { $ref }
# The column type that holds words as typed.
# en: c3328c39b0e29f78e9ff45db674248b1d245887d
common-text = Texte
# en: cc6fdf1b0963eceb567d2f5b641f4950751636eb
common-spreadsheet = Tableur
# en: 469342764c059045df7b47882a77d96ceb261898
sheet-spreadsheet-lowercase = tableur
# en: 7e53821f70ae16079c4a6a64c52a91fae645bc5f
common-numbers = Chiffres
# en: 05634091c29d83162cee95ca003dc222a3bab8ea
sheet-spreadsheet-with-formulas-named-cells = Un tableur avec formules, cellules nommées et graphiques ; trois colonnes au départ, d’autres selon vos besoins.
# same
# en: 7aeba4cd15b1afc5015285c0854f0edae2380d36
sheet-budget = Budget
# en: d99860b75cc866415325dd845f03e65f1b9fc648
sheet-planned-against-actual-line-each = Prévu face au réel, une ligne chacun, avec l’écart et les totaux.
# en: 0a0a7c3be7656f55cd259d558c2d0eb59b893b88
sheet-expense-log = Journal des dépenses
# en: c2effbb05c6382e67befb796de9be3ad264a1cbb
sheet-date-what-how-much-which = Date, quoi, combien, quelle catégorie ; un total cumulé en bas.
# en: a2d841e763d975477b0e1a51d15e6f25c9023d4a
sheet-training-log = Journal d’entraînement
# en: d5b29b7fbac7da4d79a420a8108f0c98bb1ab61a
sheet-what-you-did-and-how = Ce que vous avez fait et en quelle quantité, une ligne à chaque fois ; un total par type d’activité.
# en: 4d89a20e90ff128c4329c067414e272156b4b196
sheet-project-tracker = Suivi de projet
# en: a9f287fb1ede11b35e739a207cac5eddcfd2116d
sheet-tasks-with-owners-start-and = Des tâches avec responsables, dates de début et d’échéance comptées à partir d’aujourd’hui, durée en jours, avancement de chacune, et une case cochée quand la tâche est faite.
# en: 83c8cb0557f1a8ab76094b2801ae0b4cd23e4741
sheet-loans-compared = Prêts comparés
# en: 8ae3fb1476eab673ec96c9e2614cad18cbd6f497
sheet-amount-rate-and-years-for = Montant, taux et durée en années pour chaque prêt ; la mensualité (PMT), le coût total, et les intérêts.
# en: 53f4e4eb1a489c6a14658993062fc985a80bd775
sheet-subscription-business = Une entreprise d’abonnements
# en: f14ffb32b12ec6d73e3971054ddf5248de50852a
sheet-visitors-who-sign-up-pay = Des visiteurs qui s’inscrivent, paient et restent : un modèle en flux, avec les hypothèses à côté pour les modifier.
# en: 2f6636a8892aa5d7f9781b630c2131dc8652a7f1
sheet-cafe = Un café
# en: ce157b2ac144f603ec936234eb69d9d524c3354f
sheet-customers-day-what-they-spend = Clients par jour, ce qu’ils dépensent, et où vont les recettes du mois : fournitures, loyer, salaires, bénéfice.
# en: 27f8244e11467491805da5dcaace666e1176df07
sheet-freelancer = Un indépendant
# en: c7da5aec39e9bdd23c061f2f34a9ecb65f9f20a2
sheet-hours-rate-and-weeks-make = Heures, tarif et semaines font les factures de l’année ; on déduit les dépenses et l’impôt ; ce qui reste, c’est le net.
# en: 53ca3d56131df7985cdd58b24a369278bce0d723
sheet-mutual-aid-fund = Un fonds d’entraide
# en: 4df80f44a8c21f77f84393546555c9ab3224fe85
sheet-monthly-donors-and-one-off = Des donateurs mensuels et des dons ponctuels alimentent le fonds ; des subventions, un peu d’administration et une réserve en sortent.
# en: 992dbb972d7850082f91f3f43d7b68391091a32e
sheet-month-by-month-with-chart = Mois par mois, avec un graphique
# en: 876c69fa93189c4e89f57aeec964d0573e61be81
sheet-this-year-against-last-line = Cette année face à l’an dernier, une ligne par mois, tracées en courbes.
# en: 467dda8775e7e01a3dacd9ff5d247da7caf931d3
sheet-household-budget-by-month = Budget du foyer par mois
# en: f61119c5b20c1ed2360f6aa2b583872a1fc9c474
sheet-six-months-of-homes-bills = Six mois de factures et de dépenses d’un foyer, une colonne par mois, totalisées dans les deux sens face au salaire.
# en: 2c2609efcdcac42f94b3d73758d40d3f2f79dfd8
sheet-savings-goal = Objectif d’épargne
# en: 49ff61e9d2d6e99106df2e02e7a626aa5186c112
sheet-what-went-in-each-month = Ce qui a été versé chaque mois, ce qui est épargné jusqu’ici et ce qu’il reste à mettre, l’objectif à côté pour le modifier.
# en: ca1ec97c50f7647ef3588d5de58af33939c01646
sheet-habit-tracker = Suivi d’habitudes
# en: 7a2638dee7c38146953a64566dbd8fc8ea77d8d4
sheet-four-habits-checked-off-day = Quatre habitudes cochées jour après jour pendant deux semaines ; la part tenue chaque jour, et le nombre de jours pour chacune.
# en: d80f6ec7eac0c80248e2c7b452e21f89673449f2
sheet-reading-list = Liste de lecture
# en: c809293d68f1061cf7062072d2efc8fe95fe9262
sheet-books-read-being-read-and = Livres lus, en cours et à venir, avec le nombre de jours pour chacun et les pages lues cette année.
# en: 6e14850d9abea09c879f881a4773537f91cf2ac2
sheet-workout-log = Journal de séances
# en: b2a1db48bce10aa5ac4b8eb894555098ecbaac30
sheet-sets-reps-and-weight-for = Séries, répétitions et poids pour chaque mouvement, le volume calculé, et la sensation de chacun.
# en: 5be9810c81e208adc153f7aa0cc70f64c988d737
sheet-time-sheet = Feuille de temps
# en: df9c77cdd1cdf96f00633ef7f822543a7185dbc6
sheet-weeks-hours-by-client-and = Les heures d’une semaine par client et par tâche ; les facturables chiffrées à leur tarif, et les totaux.
# en: da7a3e11a9c1686127720177adfd2bbfed7224e0
sheet-trip-costs-split = Frais de voyage partagés
# en: bcc455f94ab37c41dad441a4152ac7961c3118ad
sheet-who-paid-for-what-on = Qui a payé quoi lors d’un voyage à quatre ; la juste part de chacun, et ce que chacun doit (un montant négatif, c’est de l’argent à récupérer).
# en: 3fcd3bd6c3c0517dc23b7c9c8a424a6ba7c30c9a
sheet-schedule-with-dates = Planning daté
# en: 9cfdf52e38ee970ebd6feac438c7d2cb6abd25c5
sheet-job-in-steps-each-starting = Un chantier en étapes, chacune commençant quand la précédente finit : qui, combien de jours, la date de fin et les jours ouvrés.
# en: 2a3b772f6e347425b5a235a2e956004ed5177213
sheet-grade-book = Carnet de notes
# en: 0e6fce40b16529c27d306da8834f33a391a5ca5b
sheet-classs-grades-for-essays-quizzes = Les notes d’une classe pour des dissertations, des interrogations et un projet ; la moyenne et la mention de chaque élève, et la moyenne de la classe.
# en: 7d9ac107a69e997e571bd6906b535f6802bc5569
sheet-membership-roll = Liste des membres
# en: 3bc0a32ca3d296ee9217f44adf3cf4d3c3dbd080
sheet-who-belongs-their-plot-and = Qui est membre, sa parcelle et sa tâche, quand il a payé et quand il renouvelle, qui a une clé, et les cotisations reçues.
# en: b884fda377a19ce445f8ec49bd90f2784834978c
sheet-seating-count = Décompte des places
# en: 4e00db4efd970061e8ff6cd63f723c7385ad1637
sheet-tables-for-wedding-seats-guests = Les tables d’un mariage : places, invités, places libres et repas choisis, avec un contrôle du total des repas.
# en: 8a535a1def73648a0a55a9bfa21c9d370e434ce5
sheet-poll-results = Résultats du sondage
# en: df60ac32ce5b04bf11e53f97d296db53c2a2cda2
sheet-answers-and-votes-for-each = Les réponses et les voix pour chacune, tracées en camembert au-dessus.
# en: bfee938677dd9bf5dab2de4f9558c07a06d616fd
sheet-fundraising-thermometer = Thermomètre de collecte
# en: f6873b16e788104f3e409c1c06243db77d2a6e04
sheet-what-has-come-in-week = Ce qui est rentré, semaine après semaine, face à l’objectif : un graphique au-dessus, le total jusqu’ici en grand.
# en: 20ded69e290360ef0be6b1fd22e648ca398d7ed3
sheet-invoice-ledger = Registre des factures
# en: 2404f6c1a633f188d6395d7b35f7dd1486c597b6
sheet-every-invoice-sent-when-to = Chaque facture envoyée : quand, à qui, pour combien, quand elle a été payée, ce qui reste dû et le retard.
# en: 300d29fd5f327e8c7a0f4614d4125d93570eeeff
sheet-inventory = Inventaire
# en: cca3ceb6d79e8c2e922aa21c8675223c1b96c275
sheet-stock-on-hand-against-point = Le stock disponible face au seuil de réapprovisionnement ; quoi commander, ce que cela vaut, et une alerte quand il est bas.
# en: ba8d2875e56e1ee2a745057f4de807182be4bb9b
sheet-petty-cash = Petite caisse
# en: 8c7a0a9d0703152466c522d2d8bbd55cfcea218d
sheet-money-in-and-out-of = L’argent qui entre et sort de la caisse, qui l’a dépensé et pour quoi, le solde après chaque ligne, et une case pour le reçu.
# en: dca1686c53daf52f46495f2a961a3346006e41ac
sheet-rate-card = Grille tarifaire
# en: 1a3c8694038b9c6d56a26e131d62c3616e165a77
sheet-freelancers-services-with-hours-each = Les services d’un indépendant avec les heures de chacun ; les prix normaux et express calculés à partir d’un seul tarif horaire.
# en: b9d1a465f75615e0b55ff620ec057c608971b8ed
sheet-mortgages-compared = Crédits immobiliers comparés
# en: 43ecdf4a244c2e1c022c6c08a3ba1c07f107ece3
sheet-four-offers-on-one-house = Quatre offres pour une même maison : le prêt après l’apport, la mensualité, le total avec les taxes, et les intérêts.
# en: 54695e5df6ef00663252186d998a600f9bac4c58
sheet-unit-converter = Convertisseur d’unités
# en: d2e0c086c77046805d1cc8934044bb315bf00aec
sheet-miles-and-kilometers-pounds-and = Miles et kilomètres, livres et kilogrammes, températures de four, tasses et gallons : saisissez une valeur, lisez-la dans l’autre unité.
# en: 9d2911edf283fc08872808d554a1017460fbe86f
sheet-tournament-bracket = Tableau de tournoi
# en: ad907a82b59f9d64761c80d6b2fe13c2a3b04fc2
sheet-eight-teams-single-elimination-each = Huit équipes en élimination directe : le score de chaque match, le vainqueur calculé, et les vainqueurs reportés jusqu’à la finale.
# same
# en: 0e2d6a433d926deb1903e03f166c76cd50bd542d
sheet-excel-xlsx = Excel (XLSX)
# same
# en: 3281188351b89c8e2db28d6da7af4992d415de90
common-csv = CSV
# en: 795a4ad3f904388d715a0384382b361f16342610
sheet-chart-svg = Graphique (SVG)
# en: 3001366084e5b141572a5a7b708f24fc835d2720
sheet-chart-png = Graphique (PNG)
# en: 492630372c601d63c25590ebdc75ab6f34a2ff74
sheet-empty-sheet = Feuille vide
# en: 2decd02b722b692c9d30d7de5e0c1191d1968de7
sheet-n-of-max-shown = ({ $n } sur { $max } affichées)
# en: 9e85be5a97dd107512bd06368b695b4265a662c9
sheet-50-more-rows = 50 lignes de plus
# en: 46dd847f36799647b69659ed71327486c70728ea
common-add-column = Ajouter une colonne
# en: dff758e7f1104295adde7af1bb92396f6c7c88a7
common-add-column-after = Ajouter une colonne après
# en: 66c7734789e19cbeef3a5ac185ea732139aed213
sheet-chart = Graphique
# en: a0e276f06261f873cb144d086a0f3c33941f43f7
sheet-chart-of-table = Graphique du tableau
# en: 1d66c3d0758e71b315e012814dc35df62cfab9d2
sheet-checkbox = Case à cocher
# en: 3c5512cb6f54f5f5483d681781a71d95982c8769
sheet-column-after = Colonne après
# en: 6d36997d9f52785865f243c2436502c328d12b1f
common-column-c = Colonne { $c }
# en: b4a57f5f40871854cb181f17a04c4e72c5c4048a
common-column-c-holds = Type de la colonne { $c }
# en: b657e2a4e550834ea13d1026bf21694fb9a65c3c
sheet-column-c-type-what-it = Colonne { $c } : { $type }. Type, tri, ajouter ou retirer
# en: cf723c59b62a173547c39c3d661c4ee7c240bab1
common-columns = Colonnes
# en: 40c14f884fe7e5b4e58ea4bd6f6d522bae43134b
common-delete-which = Supprimer { $which }
# en: 51f5ba33dabbc2c8aa4e3e640e0b27cb55aea1be
common-drag-to-fill = Glissez pour remplir
# en: 87b8f44339c3a345782b1fa838bfa3b0406567b3
sheet-abc-or-123-for-this = Type de colonne
# en: 69ff8ba19299f697ed3f5401bb7c03f0abbc4c67
sheet-drag-to-resize-double-click = Glissez pour redimensionner, double-cliquez pour ajuster
# en: 363a9922cf56c76397d7b72ae8425d30d0438b33
sheet-fill-down-from-top-row = Remplir vers le bas depuis la première ligne
# en: 549a401f55bc461388a4f5f8554db5e0749d0a28
sheet-fill-right-from-first-column = Remplir vers la droite depuis la première colonne
# en: 51f5ba33dabbc2c8aa4e3e640e0b27cb55aea1be
common-fill-drag-to-carry-these = Glissez pour remplir
# en: 4425eb9442fea0435d290b7a34f1ad8a6980e789
sheet-fit-columns-to-page = Ajuster les colonnes à la page
# en: 720f58fb1f9353ab3c904b888ccb774c40393e06
sheet-formula = Formule
# en: f1e410ad1472b42cb42cc98962428637290b6706
sheet-function = Fonction
# en: 4c0ab96e8dd44e528589261be865f136fcbae564
sheet-high-to-low = Décroissant
# en: 22c03da74b04607929f25258870ac2571a1b46bf
common-insert-n-rows-above = Insérer { $n ->
        [one] { $n } ligne
        [many] { $n } de lignes
       *[other] { $n } lignes
    } au-dessus
# en: 5e3141f35e5d110b9f6303876cf866971f689046
common-insert-n-rows-below = Insérer { $n ->
        [one] { $n } ligne
        [many] { $n } de lignes
       *[other] { $n } lignes
    } en dessous
# en: ae3b3fa65ff4f34adbaf5d76e694293bb2059fbf
sheet-letters-keyboard = Clavier alphabétique
# en: 7177342b32d961e7d51feb4571231982a48a0772
sheet-lock-these-cells-so-reader = Verrouiller ces cellules pour que les lecteurs ne puissent pas les modifier
# en: 893190219ca26f4bad6f2395b91da6295cab23b6
sheet-locked-part-of-model = Verrouillé : fait partie des formules du modèle
# en: b1b588e8ffba9c37d560f4b4d63c6344d009ce2e
sheet-low-to-high = Croissant
# en: 1dc043bb8eb5646851ff808477bb5d3573739f1c
sheet-money = Monétaire
# en: 709a23220f2c3d64d1e1d6d18c4d5280f8d82fca
common-name = Nom
# en: 3f37ebdc04c6216818bd5bbf8724175546a880c8
common-name-of-column-c = Nom de la colonne { $c }
# en: c103a2458adcf85547000188a915ccb91f45ee9c
sheet-names-cell-to-its-right = Nom de la cellule à droite
# A money column's currency (Money picked in a column's menu): the field's hint, and what it says of words it cannot read.
# en: d02550533b8780a7e646803c3b7b9cb7a78ba756
sheet-symbol-like-or-code-like = Un symbole, comme €, ou un code, comme EUR. Laissez vide pour la devise du document.
# en: 1224b5538c873fc11d856120fedeb76e516529c6
sheet-symbol-of-up-to-three = Un symbole d’au plus trois caractères, ou un code de trois lettres.
# en: 630470a61228c20119f270074f1e0b6a4c2d9151
sheet-no-chart = Pas de graphique
# en: b7baa1d40c4ea29afc9098732bffee2a861a6c44
sheet-number = Nombre
# en: 80838be5576c4b333f764e352ef9e6c5292b2b78
sheet-open-link = Ouvrir { $link }
# en: 1d6f3ce763f138e0025747a9d3ae7f30efc75531
sheet-opens-when-clicked = S’ouvre au clic
# en: ac556cf5938d2104533c38103305f6cf60ba245d
sheet-percent = Pourcentage
# en: 4f9fa8ea1af8cde7cca877c50ca723eeadee35dc
common-remove-this-column = Retirer cette colonne
# en: 12ee6fe44798c4fe94090bef612f25e903d9cd15
sheet-resize-column-c = Redimensionner la colonne { $c }
# en: fa84cb8f7793313625378f4a9caa43b1abbf650b
sheet-rich-text = Texte enrichi
# en: 45c89f220501dfd15e267bf7d636dc7a76526971
sheet-row-above = Ligne au-dessus
# en: 9be9bf4f94705d404df5c715fda96ae93fda7494
sheet-row-below = Ligne en dessous
# en: 95d5eb6f6a50994282979432eb3c4dc5836db2e2
common-row-n = Ligne { $n }
# en: 7d69f57d4baecc18e3e40be8d939c9d2cbc2e2f1
common-row-n-lowercase = ligne { $n }
# en: 8fcfbe7f09950cb9105bd4280c43ee2524090dcf
common-row-n-insert-or-delete = Ligne { $n } : insérer ou supprimer des lignes
# en: 767a59f7f0079a019b266853b864269f92d10d82
common-rows-b = lignes { $a }–{ $b }
# en: b92fe41ac34453cd0368f0fa5d00d1e9b0279c12
sheet-selected-cells = Cellules sélectionnées
# en: 26b30f90bad8aab892824738a0dc60bd11d082be
sheet-show-all-text = Afficher tout le texte
# en: 9580fcbce0c31ceaa47eb583e5f7ce637fdc8a0a
sheet-shown-as-typed = Texte brut
# en: a2a5bdeca9391be1e0cdff1c19895bae7fadc2c2
sheet-sort-rows-by-it = Trier par
# en: ff87bd67a9f3709f0a4247baa8ba4de4a5bd5fd2
sheet-suggested = suggéré
# en: eda0b8f3c389658a7369166fd4c36099e380adff
sheet-is-as-wide-as-it = La feuille a atteint son maximum de 26 colonnes.
# en: 0f54b98f336606a21f0bcbdc77afa4474b2b1966
sheet-is-full-its-last-rows = Impossible d’ajouter des lignes : les dernières lignes ne sont pas vides.
# same
# en: 7a74dff615ee3bcbc90d8c31886f01082413c776
sheet-three-at-least = Minimum 3
# en: c97ecbf8fed8c8a3a0d51412e2e9bd4c8539ba26
sheet-unlock-these-cells = Déverrouiller ces cellules
# en: 7e592be640ccac5b2bdf24df5b74d19326b5094a
sheet-what-it-holds-sort-columns = Type, tri, colonnes
# The Spreadsheet: any column removed, the Option column, rich cells, a chart put in from Insert.
# en: 63362bbc585e9e03cbf63abe945bcf99aa4d8cc5
sheet-keeps-one-column = Une feuille doit avoir au moins une colonne
# en: 7208e66f41dd004e736a1840e2a99d288a4c2060
sheet-choices = Choix
# en: 38b6d89278519f90efb25eb841096bc63d9095e0
sheet-choices-for-ref = Choix pour { $ref }
# en: a871e2c9206cb4854cc06c30bc6de95cb82f9700
sheet-has-one = La feuille a déjà un graphique
# en: f0dfb92a1f16391ab3bd5478ce9d8c0f2d74bf95
sheet-edit-cell-caret-at-its = Modifier la cellule, curseur à la fin
# en: 28d1a54d2e35ad87c0d19942f68d70ddbf67bcee
sheet-put-back-what-cell-held = Restaurer la valeur de la cellule
# en: 2b69414b3787eaa8a38f2f1a9c4a48aff7dd78a5
sheet-put-dated-rows-on-calendar = Mettre les lignes datées sur un calendrier

## downloads: hand-offs to another app (kit/file/exports.ts)

# en: f03b6f674b16abfbc970946d0781228b3407655e
export-open-in = Ouvrir dans
# en: 7f7b61c3d0574fa0bae27972834652c8b6f222e6
export-pdf-file = Fichier PDF
# en: 20ab05206208a4e9bea088d36c6640c781c6bf65
export-copy-link-that-downloads-ext = Copier un lien qui télécharge le .{ $ext }
# en: 389a8e30f70f547f507d418d67a8048c7eb2eda4
export-could-not-share-ext = Impossible de partager le .{ $ext }
# en: 5869a7d435c371c52a7c02fe623f625c5062ba1c
export-could-not-show-ext = Impossible d’afficher le .{ $ext }
# en: b31bab5111d8c6e8c5b51deffa133f4e7063ec37
export-download-ext = Télécharger le .{ $ext }
# en: 6d92cb44456263f51e52b62171b3602b54c5fec0
export-share-ext = Partager le .{ $ext }…
# en: f9b579ae7d7104f25e1800d18a5b3e89343618cb
export-view-ext = Voir le .{ $ext }

## the icon library (kit/ui/icons-picker.ts)

# en: 716f63b96e0c263222949a3b8a00cdb4f46d3183
common-icon = Icône
# en: 07b3e447db02b7cc20a78a57c316febae22ed72b
icons-favorites = Favoris
# en: a8b63bb6a000ce6560e6126bf0fade0a56fef128
icons-search-icons = Chercher des icônes
# en: 7fcd8d44c6f295423534073543e6050ddd8cf497
icons-suggested = Suggérées
# en: edb8f6c14252759cd8673c61a24376d32e17b93a
common-icons = Icônes
# en: 7d9b3876b6aa451cf6a99a0323e97ba79d6a4a27
icons-no-icons-match-q = Aucune icône ne correspond à « { $q } ».
# en: 213898967018ae7e0c3b4bf96e59877f9d434ca7
icons-search-by-name-or-by = Cherchez par nom ou par sens (« argent », « météo », « ia ») pour trouver l’une des { $n } icônes.
# en: 95553ba8a4056a6f9817d2dbbf0be4c66d9eacd7
icons-no-icon = Pas d’icône
# en: 1935c7dc9183bd8f7d4987f70ff5592b29d45397
common-icon-or-emoji = Icône ou émoji
# en: b37554f695b15005fd23907b9488e0a8ad4bca5f
common-people = Personnes
# en: 1699cec34f8ca2d63e0b366fc1fe83d5de3a0c13
icons-search-icons-and-emoji = Chercher des icônes et des émojis
# en: da588993ff27cbb60e3c1cecefb192d389748ef0
icons-or-emoji = Icônes ou émojis
# en: 5090a9e78c899272a10648b39e7689bc40072825
icons-emoji = Émojis
# en: d30201283cf13108c4beeb8c7c1787e5cda37590
icons-no-icons-or-emoji-match = Aucune icône ni aucun émoji ne correspond à « { $q } ».
# Unicode's emoji groups, as the picker's Emoji set names them.
# en: d883a36d4ea749e2946b208450185bccfbca11c2
icons-smileys-emotion = Smileys et émotions
# en: 45f4db9fab3599be7af02e3a58af52988789725d
icons-people-body = Personnes et corps
# en: fee7d0c1beea3c67c9a835315496da822a22e839
icons-animals-nature = Animaux et nature
# en: a9704a2ad9afea5f9d4d1504458f91e253557264
icons-food-drink = Nourriture et boissons
# en: 4cea7e0a28a73fafbe052e8132f1c86cd07a68ed
icons-travel-places = Voyages et lieux
# en: e58f7f889902c81b8879128fede278022f0e459c
icons-activities = Activités
# en: 72a83add2c5ede877c10d23f302d3e17accbadab
icons-objects = Objets
# en: 22ad664e9eb98b75a73333b2b2395fc4b52e6fc9
icons-symbols = Symboles
# en: 5d728758adcdd5154d3be55552c1c061ef1489b2
icons-flags = Drapeaux

## the Drawing Tool

# The group heading the Drawing Tool sits under on the home page: Design. 'Draw' is the Animator's mode for drawing.
# en: bfa50c7a3838fc883b8f4fd701b280e77a3952ea
draw-draw = Dessin
# en: 51c99e5a9ce98b2b6990b55b10a46d2fd23a18f1
common-drawing-tool = Outil de dessin
# en: f4f99578c04e974810cdd12ceb7ae902de7291d3
draw-drawing = dessin
# same
# en: 59b035367211a9382930b2a4c13637dbc33c4f32
common-design = Design
# en: 0077c4c9a2bcb4318b7a85a034bc75912afc3cb5
draw-boxes-arrows-icons-and-labels = Des boîtes, des flèches, des icônes et des étiquettes sur une grille ; ou du pixel art, qui peut devenir un motif de fond.
# en: b807ee7758852c19e577610f2c56bf3ee0fb29bb
draw-request-flow = Parcours d’une requête
# en: 00cbc89498c2f280038a754777730896717e8071
draw-browser-asks-server-which-reads = Un navigateur interroge un serveur, qui lit les données : des boîtes reliées par des flèches.
# en: 0b2cbbcb4742328b0a7288f1b69223de737b2d15
draw-flowchart = Logigramme
# en: f7a7e4b122a1c6db709d59b923a8e915ae67c9b3
draw-three-tiers = Trois niveaux
# en: 8d884dc3538d977a76ea897e377b897d4b3cdc0c
draw-phone-and-laptop-api-database = Téléphone et ordinateur portable, une API, une base de données et un cache : un système dessiné avec des icônes et des liaisons.
# en: d5786d3d397a91b189e23529401c4f8d35cd09b0
draw-floor-plan = Plan d’étage
# en: fddd68346c75bb66ad003c667e573feb965f7ca4
draw-one-bedroom-apartment-from-above = Un deux-pièces vu de dessus : les pièces en rectangles, étiquetées, les portes en ouvertures.
# en: 38a0d171dc9e21d8e32aacfbb8a170dad9977d9c
draw-pixel-heart = Cœur en pixels
# en: 7f51a7b112b9965b1cf5d78f9b43f76de5ad8f0d
draw-16-by-16-heart-in = Un cœur de 16 sur 16 pixels, à colorier ou à recommencer.
# en: c65ee0720b3ba1dac7268415c7c987faabecc4a8
draw-background-tile = Motif de fond
# en: e78fb3ca7b230e0df30391c85eec105bf55656bd
draw-8-by-8-pattern-that = Un motif de 8 sur 8 qui se répète : utilisez-le comme fond d’un dessin, ou de n’importe quelle page.
# en: 99cb45a6f4e975a5a7be78811422b5933dd6598b
draw-card-for-ninetieth-tilted-on = Une carte pour des 90 ans, inclinée sur un fond de confettis : un grand texte, des fleurs, des mots doux de la part de tous.
# en: 2020c98a00da0ecd8574350e226b7d4c448a451f
draw-phone-screen-sketched-in-boxes = Un écran de téléphone esquissé en boîtes avant son développement, avec des notes sur la raison d’être de chaque partie.
# en: 106c289912d69f2f02f64b1c195daa945a29c19f
draw-rosette-with-ribbons-for-volunteer = Une rosette avec des rubans pour le bénévole de l’année, à imprimer, découper et épingler.
# en: c9c7469b74c0a43646cb4a46279d9930b271ca19
draw-block-party-from-above-stage = Une fête de rue vue de dessus : la scène, les stands, les premiers secours et où se retrouver si l’on est perdu.
# same
# en: 6d12c8adbefeaeacac0d48274df3a195ca9a1d17
draw-badge = Badge
# en: 32787c0201e95e7dd6ca00aa5dd63210e278e3db
common-birthday-card = Carte d’anniversaire
# en: be3883124104a86065f65c46fcf4edff20e0842f
draw-can-we-refund-it-stores = Peut-on rembourser ? La politique de retour d’une boutique en questions, réponses et marche à suivre.
# en: 619a6e052e5343b8fbad2bfbc5a35d0aa4ec763f
draw-event-map = Plan de l’événement
# en: 6349ac251c1b86c4744c7e0361a5e72ea5e38402
draw-four-16-by-16-icons = Quatre icônes de 16 sur 16 sur une grille, soleil, nuage, pluie et orage, à copier pour une prévision ou un bouton.
# en: 9c6396f6f0d3ea9cb4720d61fecd3ede243d72c8
draw-game-sprite = Sprite de jeu
# en: 8752fbad4e546cb5ffe343544f280f98fc20d43f
draw-logo-sketch = Esquisse de logo
# en: 26dbc52edd1d138f4ab006d860b56dee54bf919f
draw-order-to-doorstep = De la commande à la livraison
# en: 9bdb2a0b447519986c24ccc21eaf68976587c9fc
draw-pip-frog-32-by-32 = Pip la grenouille, un héros de 32 sur 32 à l’écharpe rouge, cerné d’un trait et prêt à être animé.
# en: d8cca3dd62ad1e4c37a8b10c054464bbcb13e3c9
draw-room-plan = Plan de pièce
# en: fcba7b3fe14a456c5dd428b4e0b28552efa25751
draw-living-room-rearranged-sofa-rug = Le salon réaménagé : canapé, tapis, bibliothèque et bureau à l’échelle, le débattement de la porte dessiné.
# en: 8640aa92343372c68f5d72660821c342598d8b38
draw-three-ideas-for-coffee-roasters = Trois idées de logo pour un torréfacteur côte à côte, le nom en grand, et une date limite pour choisir.
# en: 68224d905ee1bc5c63082121b1e80cf6fe7d08c1
draw-weather-icons = Icônes météo
# en: 0d07d8bcde49fe88082ab75f75e2fd49bbcef253
draw-what-happens-to-package-from = Ce qui arrive à un colis dès l’achat : un processus en étapes, avec des icônes et des liaisons.
# en: a5be156d0e860e683861363db9d3c32c664ca943
draw-wireframe = Maquette
# en: 3e8785ece820edb3b53646af4cc1d4e3d40e13cb
common-picture-svg = Image (SVG)
# en: 833ba107dc3d58db8b9f35a717d7bd43c83a0817
draw-background-tile-svg = Motif de fond (SVG)
# en: 34f2e94dc9cb747e7afc204c645943fa3ab68196
draw-background-tile-png = Motif de fond (PNG)
# en: 75f5b48c5980dd2997738dd7416aa5fe8ca60e9a
draw-animate-this-drawing = Animer ce dessin
# en: a42ec2578a2a55cc28dcfbd53e3c34dee5d31d78
draw-drawing-of-things = Un dessin : { $things }.
# en: 2759692cb0d64c0c370b6516074bb1de744a31a2
draw-drawing-of-n-unlabeled-shapes = Un dessin de { $n ->
        [one] { $n } forme sans étiquette
        [many] { $n } de formes sans étiquette
       *[other] { $n } formes sans étiquette
    }.
# en: f33cdbb01b5b65fe3fe8928669d13ca09b3b5403
draw-leads-to-b = { $a } mène à { $b }
# en: b9e37b62382792094f5463a54183d523118a25a0
draw-joins-b = Liaison entre { $a } et { $b }
# en: e0883468badf6a5f9c1cfe0ce209a16939a64683
draw-empty-drawing = Un dessin vide
# en: 1f9c4a5ed21a39ed45db86eb13cbff389eede2cf
draw-pixel-art-n-by-n-filled-squares-filled = Pixel art, { $n } par { $n } : { $filled ->
        [one] { $filled } case remplie
        [many] { $filled } de cases remplies
       *[other] { $filled } cases remplies
    }.
# en: 2aafc8e9796ba5ac5ccffa1800cf6c5ba65250fb
draw-pixel-art-n-by-n = Pixel art, { $n } par { $n }
# en: 8598222918d3c6e513d63060cf55e2971ded729a
draw-select = Sélectionner
# same
# en: c158695a64adb40952c1cf9fde78b62bd6147f42
draw-rectangle = Rectangle
# same
# en: 8580e3175f4eb7461a5fac359ee86cd4c559d555
draw-ellipse = Ellipse
# en: b3850e04b5cc10929206d2336efa79a041358d57
draw-diamond = Losange
# en: ea9676003762818513c636984faeaa0ae356839a
draw-line = Ligne
# en: 3a4758c3cc8dac2d76026d0733816741f9b21d43
draw-arrow = Flèche
# en: 24421a551f456e8f5bde7180378b590f0337c041
draw-join-two-shapes = Relier deux formes
# en: cf6c07e7054fad4d6a8affaf62f285e16525c46e
draw-pen = Stylo
# en: c72e323a57434ede3b6eb0cc235109eb76833c55
draw-any-shape-tap-for-each = Polygone : touchez chaque coin
# en: 016a5405a0b425e7d1ac65317df59b45ce5fb1f5
draw-freehand = À main levée
# en: 8a48ec1f6c073fad0326a0e9251a18e4c88660b5
draw-drag-to-draw-line-or = Glissez pour tracer une ligne ou une forme
# en: dcd096d38fc0be24bd96ac76246e98341b853208
draw-rounded-box = Boîte arrondie
# en: 08596d60c57fd87e530cbdd2a06052b06d8c4137
draw-hexagon = Hexagone
# en: b116d77a368034d3de6ca1dc0414de7dfd49400b
draw-parallelogram = Parallélogramme
# en: 817b354dc01a34895eab0c37e21af38dc0850d08
draw-cylinder = Cylindre
# same
# en: 2c924e3088204ee77ba681f72be3444357932fca
common-note = Note
# en: b406fb57b29fc76f71864fbb37f0238045f84d9d
common-black = Noir
# en: cc9db3a795571c7e71f45670a1da7ff49b5f1557
common-red = Rouge
# same
# en: 09fb6aaba7940a7b7ffdbc9cbb9b3498303c1bad
common-orange = Orange
# en: 933bf21afdd55a0d2283845fed0e7bbdd1f5db49
common-green = Vert
# en: 7d44bc449c2a26374800a503f10f3d8949505f40
common-blue = Bleu
# en: 32576f4fedc07f63020353af6a8aac66c4452c4c
common-purple = Violet
# same
# en: 3b4e294693563cc45de95b9db8b4abeabfac77db
common-indigo = Indigo
# en: 3526f607bcd4f51ad0bc05f814579a42c2c0ba57
common-yellow = Jaune
# en: b3d97fd6dece388a968e367f3ac4b9e64d739f52
draw-sky = Ciel
# en: 54076359fdc7f1f0e000b9ae15b96f8b09866acb
draw-pink = Rose
# en: 168cbb2ea52b9e34d271accecfa7d7951e948a99
draw-clear = transparent
# en: b1985e387405e4d4afb40d5dac9b2656f5d6f770
draw-shapes = Formes
# en: 4bab2d8fe13fa6ab57f80098b414f0f734c5dd25
draw-more = Plus
# en: 34f9968677e8b728f4405bf338fba32c66bd2a77
draw-icon = Icône…
# en: 64dd60fe1a049fe6db3eb1369dec2e42bf428e21
draw-background = Fond
# en: e1946387893c804aeadc93e5df5af3416cf1dc53
draw-remove-background-tile = Retirer le fond
# en: 1d0c8304baedcf8e3a78982c2e7c0b04622bf2a0
draw-color = Couleur
# en: cfdd099c4751f2f9aef2491f411111906956e0f2
draw-arrange = Organiser
# en: 8c4e184c7224521ecdb958ef6eb40a05b5171f9a
draw-no-fill = Sans remplissage
# en: 7adb6736cf2c9ae017b128f98738ffbae0e58655
draw-fill = Remplissage
# en: 1f65ed95fba62cd5b74b58c2ca9ba63448117160
draw-bring-to-front = Premier plan
# en: e259d4e19e695a41e2f10680f2e3f5693711382a
draw-send-to-back = Arrière-plan
# en: 972d57379db3e5be76d4ead709fef1ad71ff03d6
common-duplicate = Dupliquer
# en: 5301648dcf6b53cefc9ed52999aaa92d4603cae0
common-edit = Modifier
# en: f6fdbe48dc54dd86f63097a03bd24094dedd713a
common-delete = Supprimer
# en: d7bc7e98ec7a8acfd61dabe29e1e9156adf86fb9
draw-put-icon-on-this-shape = Mettre une icône sur cette forme
# en: 33bde816f0f7a53b8de67b8f8d6981f47e28159b
draw-place-icon = Placer une icône
# en: 4fc05f2763ba31e2d3be5f08e7d0bab5d5dcbf78
common-zoom-in = Zoom avant
# en: a4ae4b24a1f5369c2bff61abdbc221170e4b27d8
common-zoom-out = Zoom arrière
# same
# en: e30eff925100b7c3e119ed678e39009e962455b0
draw-alt = Alt
# en: f978200b112084eef0c088e1d0075ad2fbca39cf
draw-alt-text = Texte alternatif
# en: 5cb1c64554b7e1dc72e12360f2d04f33dc206b1d
draw-alt-text-alt = Texte alternatif : { $alt }
# en: d039700b1af48db561cd71c056aed2737e8fae32
draw-add-alt-text-describe-this = Ajouter un texte alternatif : décrire ce dessin pour les personnes qui ne peuvent pas le voir
# en: 676f1e162fc4f58007821f7c1a55b893e9a04715
draw-what-does-this-drawing-show = Que montre ce dessin ?
# en: c8636572fb4b9e79bae4c9fef82fc8109961c471
draw-diagram-of = Un schéma de…
# en: 5a33f2e7e84274a5291191ca3105e62d897eee0e
draw-read-aloud-to-people-who = Lu à voix haute aux personnes qui ne peuvent pas le voir, et conservé avec le dessin partout où il est intégré ou téléchargé.
# en: 988c63b77eade4f718f9d469cb36e35bff976839
draw-describe-from-shapes = Générer d’après les formes
# en: ac302ae45938c985822f097507602d624128f1d0
draw-tap-or-drag-to-paint = Touchez ou glissez pour peindre ; les flèches déplacent, Entrée peint.
# en: ea263dc45b04f2755ac61a51deecc96ade3fb6a9
draw-tap-each-corner-tap-first = Touchez chaque coin ; touchez de nouveau le premier, ou appuyez sur Entrée, pour fermer la forme.
# en: ccdc55c46a79ea604962ddda9cc010311bdca4fe
draw-drag-to-draw-end-where = Glissez pour tracer ; terminez là où vous avez commencé pour en faire une forme fermée.
# en: ef5a6074bd843b506d359711212e8236802d80c4
draw-press-on-one-shape-and-let-go-on-another = Appuyez sur une forme et relâchez sur une autre.
# en: 1005cc8c1dafc1f9eb422bf2ac68290b492fdfd1
draw-now-other-shape-tap-it = Maintenant l’autre forme : touchez-la, ou choisissez-la avec les flèches et appuyez sur Entrée.
# en: e3686f1c55ec91e31825e1d9510abf592d80b08a
draw-drag-to-move-them-together = Glissez pour les déplacer ensemble. Maj+toucher ajoute ou retire une forme.
# en: eb36764c60ec7a17dd6ac3ec7dbbd22ee401778e
draw-press-on-one-shape-and = Appuyez sur une forme et relâchez sur une autre
# en: 199f4e86afea4f2d42eb40b63ce8599168575e06
draw-tap-where-icon-goes = Touchez l’endroit où placer l’icône.
# en: 86da5e24511bad8c1cace935e830c0625b04b607
draw-drag-on-canvas-to-draw = Glissez sur le canevas pour la dessiner, ou touchez pour en placer une.
# en: a5742851f0f81d3bdcf184cb2a164390f3e989bb
draw-eraser = Gomme
# en: 5136ae1b5bfe9175a6ed64915e648bdc240443a7
draw-pencil = Crayon
# en: d60e52fb8066ebf1bf1329750c068e7042c783fd
draw-clear-grid = Vider la grille
# en: 45ecea7c16e725c14cfec68f5b12d1545f222a73
draw-use-as-background = Utiliser comme fond
# en: 507f52dfd67fb731677bb9ae6971f9b5e891bc84
draw-grid-is-now-background-download = La grille est maintenant le fond. Téléchargez-la comme motif, ou utilisez-la sur n’importe quelle page avec tile:.
# en: 209a1a74ee8eec09b861bc34e5ddb08a1357a364
draw-pixel-grid-n-by-n = Grille de pixels, { $n } sur { $n }. Les flèches déplacent ; Entrée peint avec la couleur actuelle.
# en: a9deda2292f9b3c9a827e2aa71e0da6b4db9f16e
draw-row-y-column-x-ink = Ligne { $y }, colonne { $x } : { $ink }
# en: d316afce8845f59e541c981d07d81bab22858d00
draw-as-repeating-background = En fond répété
# The contextual bar under a shape, and its words typed on it.
# en: 27bb3dadbebca64cec249a9811a07cd3ea25a520
draw-dashed-line = Trait en tirets
# en: 8953b1fb5c8eeda2158dfd09bde1a766d4b9079d
draw-dotted-line = Trait pointillé
# en: 6597b9e38708468a6ada223bbd324b34dd9b8d23
common-edit-words = Modifier le texte
# en: 73a03229ad334f953ab9119481b53f881218d015
draw-extra-large-text = Texte très grand
# en: a489f3e9ff96e710da6f0dad589e2e4f58ba2dde
draw-gray-fill = Remplissage gris
# same
# en: d160e0986aca4714714a16f29ec605af90be704d
draw-l = L
# en: d7f442ef62cb3d9ac929d5c992b5daf0ca7721d3
draw-large-text = Grand texte
# same
# en: c63ae6dd4fc9f9dda66970e827d13f7c73fe841c
draw-m = M
# en: 3142905be6683e711043cf1317f0beb5a495ee4b
draw-medium-text = Texte moyen
# same
# en: 02aa629c8b16cd17a44f3a0efec2feed43937642
draw-s = S
# en: 11cc69c6f994eeb6dd90a55a7ce3bbc682544f87
draw-small-text = Petit texte
# en: 6e9a379022a3fda2be5039485a0a092130c73f70
draw-solid-fill = Remplissage plein
# en: dcfb9c041348e0d62c058f37225ad2185472edc8
draw-solid-line = Trait plein
# en: b233a397b799e80f21b88a34ae7e30af0528d1c1
draw-shape-in-hand = Forme sélectionnée
# en: 6be4ddf808de37e8c50aae4f621dd09b03f5a4e6
draw-words-of-shape = Texte de la forme
# en: 1737205dd1aad709dc2209b2e892ffb8c4de0fc8
draw-type-words-enter-is-done = Tapez le texte. Entrée valide, Maj+Entrée ajoute une ligne, Échap annule.
# same
# en: a2f9d0d16d02a20ef369e6029d9e5929c3d70d3e
draw-xl = XL

# en: aba6eb7da15924b741fdff98ff19be9915cd84f1
draw-drag-to-move-corner-handle = Glissez pour déplacer. La poignée d’angle redimensionne, la ronde fait pivoter. Entrée ou un double appui modifie le texte.
# en: 9cacab39109399036915a6b67336853e622472cd
draw-drawing-canvas-v-selects-r = Zone de dessin. V sélectionne ; R, E, D, L, A, T dessinent ; les flèches décalent ; [ et ] font pivoter ; Entrée modifie le texte ; Suppr supprime.
# en: 4421c5912fa5d727f23883b0a69028e195e3717b
draw-tap-shape-to-select-it = Touchez une forme pour la sélectionner, ou glissez autour de plusieurs. Choisissez un outil pour dessiner.
# en: 6f72f3cd1255e9bb344a1f9adb5fc64770f07cd5
draw-rotate-left = Pivoter à gauche
# en: b75f23d1d0e44603289911e22ad5efd66157913a
draw-rotate-right = Pivoter à droite
# same
# en: 4e41a56fa9e8996a27760c0b9c78c126b0892d19
draw-pixels-n-n = Pixels { $n }×{ $n }
# en: 6469ebd3a4fdb9e64f402eed612d2bfc0e0bf746
draw-align-center = Alignement : centré
# en: b25d3dd496584e2c6258aa9c77cc555dfd5988a4
draw-align-left = Alignement : à gauche
# en: e65f83bdf0bfbca6e0efd3f75baa155ab6652113
draw-align-right = Alignement : à droite

## the Animator

# same
# en: a6b8b600c27ce95ddcf867cfc503564c89fe816a
anim-animation = animation
# The templates: what each motion is, in a line.
# en: ec026663a7e4c23dd850c7f5a96deef71bf8bb81
anim-lift-off = Décollage
# en: 5d15aaf0784e98385ffc925f574edbf1a0657292
anim-rocket-climbs-away-with-its = Une fusée s’éloigne avec son ombre tandis que les mots s’élèvent : deux formes, deux images clés chacune.
# en: 1cc22feeb4a82e33a9fd435fbf7c4a927a0408e1
anim-bouncing-ball = Balle qui rebondit
# en: 567b2c86aa06b4d0133474a39dc6545196754a25
anim-ball-falls-faster-and-faster = Une balle tombe de plus en plus vite vers le sol tandis que son ombre grandit dessous ; jouée dans les deux sens, elle rebondit sans fin.
# en: 7296aa4a483797a1a82ec05a4598688ca056cd36
anim-loading-spinner = Indicateur de chargement
# en: ccf7f6eb9188fe228da413a1aaf39c5ee4994346
anim-eight-dots-in-ring-each = Huit points en anneau, chacun gonflant à son tour, si bien qu’un point brillant tourne pendant qu’une page s’enregistre.
# en: 691f884e182237907640c6964bda657a5ffec1c0
anim-title-card = Carton-titre
# en: 56d07df6f27b468d9e3456707110962e1da029c6
anim-red-curtains-part-on-opening = Des rideaux rouges s’ouvrent le soir de l’ouverture et le nom du festival s’avance : jouée une fois, elle s’arrête sur le titre.
# en: 1383ce3b8f642f2c5946975ca61e868e4a504819
anim-present-hops-stars-and-hearts = Un cadeau saute, des étoiles et des cœurs se balancent autour, et les vœux brillent en lettres arc-en-ciel.
# en: fad7f01d931894b10da998319cdc82f1a7d7e4dc
anim-quick-standup = Point rapide
# en: 79d688c0e9e1f3c402c3d6bedae252cfdd0b27aa
anim-meme-with-caption-above-and = Un mème avec une légende au-dessus et une dessous, et une horloge qui tourne et vacille entre les deux.
# en: 7e9b34abf6e91127f94374508015ad795c91268b
anim-build-is-green = Le build est vert
# en: 2015347d0927e36755702bf7ae8677fa8d565545
anim-meme-in-two-lines-of = Un mème en deux lignes de texte Impact, et un trophée qui entre en tournant, atterrit et rayonne.
# en: 98eb193445404588fd801a26b8383def925748ab
anim-flash-card = Carte mémo
# en: 864aea3fc448ba5b87612d5e8c4c6dafde49b09a
anim-card-shows-spanish-word-turns = Une carte montre un mot espagnol, se retourne pour donner l’anglais, et se retourne encore : une rotation autour de son axe vertical.
# en: 23015d1cbacca964e41f5cbb0021ed050964a9ed
anim-weather-this-week = La météo de la semaine
# en: 8dc082991f9eea4f537ecd34d66858c28b08bcb6
anim-four-days-of-weather-in = Quatre jours de météo à Lisbonne, chaque icône vivante : le soleil tourne, le nuage dérive, l’éclair sursaute.
# en: b8224dd56d927c2c68b1498f39b7a2ed20f88c57
anim-new-year-countdown = Compte à rebours du Nouvel An
# en: 6b46f602f1762ee9ef676cfb3d455fba6a9a07df
anim-three-two-one-second-each = Trois, deux, un, une seconde chacun, puis la nouvelle année arrive en lettres arc-en-ciel : jouée une fois, elle s’arrête sur les vœux.
# en: e004a532912502de514d6c1801dcc60517d6007a
anim-flight-path = Trajectoire de vol
# en: 69049056a83981f31dea9f7350b7356570e735b3
anim-plane-crosses-dotted-route-from = Un avion suit une route en pointillés de New York à Lisbonne, en montant, avec les horaires du vol au-dessus.
# en: 7de4868fea7340b1b7e0779ba2e81218c703ab57
anim-neon-sign = Enseigne néon
# en: c0cba8072586f9c04d65da0f16b714c865f261e1
anim-cafes-sign-at-night-name = L’enseigne d’un café la nuit : le nom vacille, les horaires ressortent dessous, et la tasse brille et gonfle.
# en: fadf71c7ea92e6416fd6d89969f8e78a115cd3c1
anim-sunrise = Lever de soleil
# en: 672c99d7a4f36fb3de226944eb862e3c9faa5663
anim-sun-comes-up-from-behind = Le soleil se lève derrière les collines et le matin glisse dans le cadre : profondeur, taille et un horizon dessiné au stylo.
# A key is a moment a shape is set at; between keys it travels. The effects (Impact … Blur) are meme looks.
# en: dc6828c6d02be5a4b4480bdf9e7f606c74b5ffd1
anim-animated-gif = GIF animé
# en: c81fe6cce809d8d3f0bacf4a00e1c62251061d39
anim-video-webm = Vidéo (WebM)
# en: e643c3f72a4f8b13abefb3c30793c8dbb2e124d4
anim-animated-svg = SVG animé
# en: 3b906156eac7b4b957d3a83ab79a3846fa2c900f
anim-empty-stage = Une scène vide
# same
# en: 64fe85d796d8c2eda594dbc0b7b3452a4a2c444b
anim-3d = 3D
# en: fe12532bd63a2e75713ec69be11e92d48e9db3c8
anim-add-key-here = Ajouter une image clé
# en: 900aa998d3550d438fc20a414d3938fc3a1630ab
anim-blur = Flou
# en: df0e298e356261439795d0d435ce0ce576604c65
anim-depth = Profondeur
# en: 8f25a859269ca51039632dd6bba28fb061cfb8d4
anim-effects = Effets
# en: b10a3addcfc5d7372c3a6101402e1f910da21188
anim-frame-n-s-s = Image { $n }, { $s } s
# same
# en: 62036a7016ec20273ff717698fbad321c4ff002b
anim-impact = Impact
# en: 4c0a5de85ac9512b6a503ba785c3f369b5cfbda2
anim-key-at-s-s = Image clé à { $s } s
# en: 74adc5789ce92de7bbb5e3d84a287a1ce6d3e7f5
anim-mirror = Miroir
# same
# en: a7b93d2128e820f861fc8dfccd9f5521e89ad21f
anim-mode = Mode
# en: 987e5e1f455e03766d3ef3740947f4db46336d53
anim-moments = Images clés
# en: 76cdb950721642b6b8596d36d5a39f7705028b99
anim-move = Déplacer
# en: 00706b5e9ede7f2fb6145370efd20ef72969df11
anim-neon = Néon
# same
# en: 781961bc81c25697841ecce5d4d9dad9f6b261c6
anim-pause = Pause
# en: 5d12bd53552cafc41ca6146c04870df2e1574e13
anim-play = Lire
# en: fa968bd1155bd76231814d479bf070ed96cca9bb
anim-pixel-art-is-made-in = Le pixel art se fait dans l’Outil de dessin ; l’Animateur anime les formes.
# en: b4a9395d25398654fd5d000e4b82a1d8273339bd
anim-rainbow = Arc-en-ciel
# en: 3d5096b70833fdae355f1ffcf32faf2066123467
anim-remove-this-key = Retirer l’image clé
# en: aa0e7e86b7aa21e9851b9db8b752998918d2b608
anim-shadow = Ombre
# en: b7152342a267362add3c0d7f69f720f7a9c76c9e
common-size = Taille
# en: 4a6c11ab8104f8bcbb26155a8f68688d181f8a4b
anim-spin = Rotation
# en: 598549d7818087a7d04d49a7b9c00979c8a35c96
anim-stage-alt-arrow-keys-move = Scène : { $alt }. Les flèches déplacent la forme sélectionnée (ou le temps). Virgule et point avancent d’une image. Espace lit. K ajoute une image clé.
# en: a4277f79218220e03e7d4ebb5b1417cbdff137dc
anim-shapes-in-hand = Formes sélectionnées
# en: 6c82e6dd86807ee3db07e3c82bec1ae1ce00b08b
anim-time = Temps
# en: 4ad8d1291a5b6b81cd03b1408570e1aae781c074
anim-wobble = Vacillement
# en: ac906b0770d1cc5e8330907f0063ba444eb3cf5b
anim-now-s-of-all-s = { $now } s sur { $all } s
# en: c7f73bb54d928922c3838bb789ee9fb8a5b1eb37
anim-settings = Réglages
# en: 89798935dfbced66a46a24ee534e23bbf5281faf
anim-this-frame = Image actuelle
# en: cac09d8898c2435fb48b3b387ff152da7929eab8
anim-duplicate-this-frame = Dupliquer cette image
# en: 885c46b03eaf682f7c9534f7791ddfc3da84cd6f
anim-frame-earlier = Une image plus tôt
# en: 2c3d7664e236cb8254795d8ffd3761741ccfff7d
anim-frame-later = Une image plus tard
# en: bb4f3c806dbc9e6d5247da5b492939d83c90cf2b
anim-delete-this-frame = Supprimer cette image
# en: 406ce96669c44a0f4b79e02af1464b6aa7fbf232
anim-draw-shapes-move-sets-them = Dessinez des formes, puis utilisez Déplacer pour les animer.
# en: b4d477d39704ecbf21ca422aeebffbad5a519fbb
anim-nothing-here-yet-draw-something = Rien ici pour l’instant : dessinez d’abord quelque chose.
# en: 00f1eed948284854e29d59b2de928756b7f69388
anim-tap-shape-then-drag-it = Touchez une forme, puis glissez-la là où elle va.
# en: e4cabeb67c10b273fc4a1cfba538ac893c850f68
anim-drag-it-to-where-it = Glissez-la là où elle va à { $s } s.

# en: b0d1915925616cc03de525611bfe58839cf5fdff
anim-anything-from-drawing-tool-moving = Tout ce qui vient de l’Outil de dessin, en mouvement : position, profondeur, taille, rotation et retournement dans le temps, avec des effets pour les mèmes.
# en: 739720909d046c563acd15a980c916ae9b0a75f7
anim-back-and-forth = Aller-retour
# en: 7753216f948c789b0cbd5cfb16d1f50c1717383b
anim-forward-then-back = En avant, puis en arrière
# en: e3e7a3833d19706ebf33b2c3baf8e05deeed7bca
anim-frames = Images
# en: 0d0b09dfb5d45add0e2f90ec8b193d96ace76d0c
anim-frames-second = Images par seconde
# en: 3570d228949889218e4c7fdb4ad8c942753530a1
anim-how-large-shape-is-drawn = La taille à laquelle la forme est dessinée : 1×, c’est la taille d’origine.
# en: c028f533678015b6ac2e606a9cafef7e050b11aa
anim-length-speed-and-repeat = Durée, vitesse et répétition
# en: 72f516ede84adba7283e1f7f5fd8eb787c7d33b0
anim-loop-forever = Boucler sans fin
# en: 41b5b25a66d56fd91f645cbe6f83603567c3c480
anim-play-once = Lire une fois
# en: 368e8081b781aac177fd07c2415b694b1f878911
anim-turn = Retournement
# en: b2343125992a36aa775f5740930f717a0d1a76d6
anim-turns-shape-about-its-upright = Fait tourner la forme autour de son axe vertical, comme une carte : de chant à 90°, en miroir au-delà.
# en: dbe0717b0567202674ba26238e862ff18b3ffbbc
anim-turns-shape-around-in-plane = Fait tourner la forme dans le plan de la scène, comme une roue.
# en: df7db1873937e8acd60c26ebf93191ad27b738e6
anim-which-shape-is-in-front = Quelle forme est devant : une forme plus proche est dessinée sur une plus lointaine, et une lointaine un peu plus pâle. La profondeur ne change jamais la taille.
# en: 2931befb0fbc6bdabcff5b420bf41435e4315548
anim-n-times = { $n } fois
# same
# en: 4a84fdfdafe66c2c85e3e7d7c434de987984470f
anim-s-s = { $s } s
# en: b78baea4121d1dfde75020adb28737da7ea84e59
anim-frame-back-frame-on = Image précédente ou suivante
# en: ad3441e7c85b25bc4c7f46fd051345a6ba241e58
anim-nudge-shapes-in-hand-with = Décaler les formes sélectionnées, ou avancer d’une image
# en: fe13ca0956192777b5060b354cf8e5dc5553c328
anim-play-or-pause = Lire ou mettre en pause
# en: d3b310dc90b3cc480984236a80101888836acfe9
anim-first-frame-last = Première ou dernière image

## the Outliner

# The bullet is the line to the parent; a join between any two items is a connection. { $from } and { $to } are items' words.
# en: e8fb468f67bca1564ff499175d1b146c6ccd5d3a
outline-named-label = , libellé « { $label } »
# en: 02d7116f49a426f4a9dba7a6582ae90478795f7d
outline-book = Un livre
# en: 8f9c05748f1616a4649174a8917da3ee5f3217e5
outline-decision = Une décision
# en: c35876d5fcc88c6a4c142c7c0e391dda3f92ca08
common-talk = Un exposé
# en: 69d33e95f4f69c18d9591a8529f59a6703fc1f85
outline-empty-outline = Un plan vide
# en: b972f73739624a697a0aa9bdde4289bafc5b6e4b
outline-outliner-ideas-under-ideas-folded = Un éditeur de plans : des idées sous des idées, repliées et dépliées, déplacées et reliées ; le même arbre que lit une présentation ou une carte mentale.
# en: 3d47762769e98192ca611ea7fce028e70e16f174
outline-arrow-from-from-to-to = Flèche de { $from } vers { $to }
# en: 081c7d75d7a6b1052f5643338773de8ea68de0dd
outline-arrows-both-ways = Flèches dans les deux sens
# en: 1e1c0cc8db067d827d10382e4329a748d2e3b54d
outline-as-page = En page
# en: 16b6e0c696afc500fe76af1de5165a0563e80afc
common-calculator = Calculatrice
# en: adab5090ac6a1b7b5420faac7be86c41721ba27c
common-calendar = Calendrier
# en: ab732cac31bba434b0b59309a30ce46956dc3d54
outline-cancel-connecting = Annuler la liaison
# en: 5301648dcf6b53cefc9ed52999aaa92d4603cae0
outline-change-it = Modifier
# en: 1ed0b58d18ef647be5de11840bb929ecc8e36446
common-chosen-items = Éléments sélectionnés
# en: b65463cb6a42a17de514acc4659f7fd331e0876a
outline-connect = Relier
# en: f2ea879cf86d5519e3459e15ee70080a4a1306ab
outline-connect-from-words = Relier depuis « { $words } »
# en: abfb16b3d00afef63f7ed53ad9ababbf2328b5d9
outline-connect-from-to-to = Relier « { $from } » à « { $to } »
# en: 378e916868a3e40a71abc67a748f7faacc94be85
outline-connection-from-from-to-to = Liaison de { $from } à { $to }
# en: 8f3509b64e0ea82c53329cb49a7756bd1ced3566
common-connections = Liaisons
# en: af74f7c5362aaee985bf8cda3dd75fc80751ce51
common-copy = Copier
# en: 153d7a58b3a3e898fcbdd04c462af308414bd09d
common-comment = Commenter
# en: 849e384559ff16cb2dcddb75cdf0a07437bcc3f9
common-open-this-change = Ouvrir cette modification
# en: ba97113463234ae7bc314eae6a172572b35b1b71
common-presentation-builder = Créateur de présentations
# en: 20dcb3b3184067197035f08a5a3955d51fcd94a3
common-diagram-maker = Créateur de diagrammes
# en: 0d84b3e5992959bf9adbeef94468228a5827605f
common-drag-to-move = Glissez pour déplacer
# en: 52db9dc3ff903f6d241a91adcbd83848467106c2
outline-draw-as-mind-map = Dessiner en carte mentale
# en: 03683dee41f9db7fad6f8d06c6c6bd776b528ba0
outline-draw-as-network = Dessiner en réseau
# en: c01d65d48941d40cf0e4bad6bc84c525d99421da
outline-draw-as-org-chart = Dessiner en organigramme
# en: 3159fe421b3221381b3c778dc1c3c26e4540be37
outline-empty = Vide
# en: 4a66d1480779180159cc25c1c5aa9d760467c6a7
outline-everything = Tout
# en: 9cf188d3a6779d63b36b10275b0228ae22ec97d6
outline-fold = Replier
# en: ec898362fe9593764e822dd17c78f1f972c20d90
outline-fold-all = Tout replier
# en: ecdda59aea5ee67d7d854c969ccf7f4f4b4a4c54
outline-item = Élément
# en: 6f8c7dbc09548197b5d210f514dda19a015102b2
outline-item-n = Élément { $n }
# en: 120ee44bec923665b04dc825b0307fe159232ce9
outline-kind-of-line = Style de ligne
# en: 789062517bc27b8cb5c78b1e88041e5bef69b507
common-launch-plan = Plan de lancement
# en: 72eee0aaa10010ae7d362761115dfd7e064dd4d4
outline-line-from-from-to-to = Ligne de { $from } à { $to }
# en: 2859ccc92143006360893c2a9cb1aaaa13b3928f
outline-line-named-label-change-it = Ligne intitulée « { $label } » : modifier
# en: 52d55422c1936db72f18f5b9e960c2719a3560d7
common-animator = Animateur
# en: 260ff8ae7182fc851337b6b2fdb25f8cac2b8d47
common-move-down = Descendre
# en: 8a58f7b7ea514cbdf9bb23a231ad4d03f0cd0ca7
outline-move-this-item-drag-it = Déplacer cet élément : glissez-le sur un autre
# en: b4f57cd0cd5c7d88461c1718646713dea47a36c9
common-move-up = Monter
# en: 5b2d4bd98ab95d9eae0b3c956cbf98aefe9d7793
outline-name-of-line = Libellé de la ligne
# en: 3aea913567c437a81d3c153ce49d321f64099651
outline-numbered = Numéroté
# en: 89db2d16f087d4e687143e9a0071f77af473f9d8
outline-opml-for-outliners = OPML (pour les éditeurs de plans)
# en: b22f39c9558f672318bf617175bf3daaa236c71f
common-open-in-new-tab = Ouvrir dans un nouvel onglet
# en: cdd6290b6b2860663a3ff7c60cbe70af640e9c39
common-outline = Plan
# en: d7f6278b9a3a511b82633cbd63a4e86e91bab2d1
outline-outliner = Éditeur de plans
# en: e57362d579b61ac9d08f5012ee0adf6fde22a855
outline-outline-lowercase = plan
# en: db2483000d154ca9fd74d41fc4e063a4b28faa87
common-paste = Coller
# en: e45795fb6033ae4ecc1e2e3610273fce71a317d7
outline-plain-line = Ligne simple
# en: 9580fcbce0c31ceaa47eb583e5f7ce637fdc8a0a
outline-plain-text = Texte brut
# en: 67ea25b11508ee37fa6c09bc9d3a1d6aa9a30f96
common-show-as-slides = Afficher en diapositives
# en: 59df6d7de818cdbeb08aa7f083aff96c1bccd1f5
outline-show-as-outline = Afficher en plan
# en: b306a7c32ba84dd4adea8612dccc99c15065eb53
outline-take-away-connection-from-from = Retirer la liaison de { $from } à { $to }
# en: e963907dac5cd5c017869b4c96c18021c9bd058b
outline-take-it-away = Retirer
# The compound bullet (Paul, 2026-10-15): the statuses a document sets in its head, a status's pill, a due day's chip.
# en: e92aab82fce62899699581b5597abdda8175f2dd
outline-statuses = Statuts
# en: bae7d5be70820ed56467bd9a63744e23b47bd711
outline-status = Statut
# en: c206561903295f2cf5944906fdfc55f1e8a5d45b
outline-no-status = Sans statut
# en: 1bcdd54c54c2bbd162c6353f5157804ce2270af5
outline-status-status-tap-for-next = { $status }. Touchez pour changer le statut
# en: 4c1aeebc433bcb8eb4b05434619ea3136b785ea8
outline-due-date = Échéance
# en: bfe11361dd8dc7cc66f5cd6f33d394a95c71c96c
outline-due-date-ellipsis = Échéance…
# en: 1cfca97d4ac1000c67f7b345992a5b58b3dac4b0
outline-due-date-change-it = Échéance : { $date }. Touchez pour modifier
# en: 6cf55f3558276e2eefff5dd41ec206dc9780bebf
outline-remove-due-date = Retirer l’échéance
# same
# en: 891e9d6d47f1bacfcba2dca1b282afcbcd25d94d
outline-agenda = Agenda
# en: aa73cdd3260a16a41d572c06ee0da42cb4b85286
outline-by-status = Par statut
# en: 0e719dcbe720c315d66c977072f10251b56bd994
outline-nothing-to-do-yet = Rien à faire pour l’instant. Les éléments avec une tâche, un statut ou une échéance apparaissent ici.
# en: 064c87e25e9cca38db987bafd98c9fc9b3003456
outline-line-to-parent = Ligne vers « { $parent } »
# en: 99fec066e5bc2f5acc70261b4b5dd4b171fb491a
outline-arrow-to-parent-item = Flèche vers « { $parent } »
# en: e37f9b066587aa06d9d2f6df504727599d9f5e4a
outline-arrow-from-parent-item = Flèche depuis « { $parent } »
# en: 27228d1a3266064e49da7e3949d339b08473e294
outline-edit-statuses = Modifier les statuts…
# en: 70dfe3298343e43d0c29f07274084a4ce961dd7a
outline-add-status = Ajouter un statut
# en: 4f9beff18cc6852b012093ba97421788466bb3bf
outline-gray = Gris
# en: 23376bab580fd3f3d521c66a65a03e7753da54cc
outline-last-status-means-done = Le dernier statut signifie terminé. Les tâches dans ce statut sont cochées.
# en: 7312a31a2c880f2d456663b6f91ad6da980b3a5e
outline-take-connection-away = Retirer la liaison
# en: 656e5c87ae5cd391807e13c85fb32635c2d441c2
outline-tap-item-to-connect-from = Touchez l’élément de départ.
# en: 7a717eefe223e502e86655b5bf8eb999b867a9dc
outline-tap-item-to-connect-words = Touchez l’élément à relier à « { $words } ».
# en: 6ca2aebe7601f4f49f7f7df1ac23a0ac4a39abbc
outline-question-options-under-it-and = La question, les options dessous, et pour chacune ce qui plaide pour et contre.
# en: da74cb6baba7a464fd8881af861a8c8d7952aff9
common-trip-planner = Planificateur de voyage
# en: 09ae5dce4d22019190e52d1611d1544becf36489
outline-twenty-minutes-in-three-parts = Vingt minutes en trois parties : le problème, l’idée, ce que cela signifie ; une diapositive par élément de premier niveau en présentation.
# en: 2af9d498f852995329b0033573277dce32d09ba0
outline-unfold-all = Tout déplier
# en: f5857a77d395db75bc57c2c76b92dc8fa4773053
outline-unfold-n-inside = Déplier ({ $n ->
        [one] { $n } élément
        [many] { $n } d’éléments
       *[other] { $n } éléments
    })
# en: 621521f9a8788695ec292cbec54d2792cfdf0a7d
common-untitled = Sans titre
# en: 1e65f823e3600c2c4cec7aff6db37af296fca073
outline-view-as = Voir en
# en: 828c360c884f9246750461eea43fee4e42c6b52c
outline-zoomed-in-on = Centré sur
# en: 38eca6735f66d186c0bd9c549873e774551dc35f
outline-a-plain-line = une ligne simple
# en: 884abd948f43aba4e5851b71a20e97aed7a6c96e
outline-arrow-from-parent = une flèche depuis le parent
# en: b1efb9ef91ffdf7d42595fb81fb8b74184a5efbc
outline-arrow-to-parent = une flèche vers le parent
# en: 54406ea0a263efcf4d3204fff2200f7f4d982c90
outline-arrows-both-ways-lowercase = des flèches dans les deux sens
# en: 0048342aeabb8b2918689354650579bb2108a957
outline-e-g-owns-feeds-reports = p. ex. possède, alimente, dépend de
# en: e7292866259d82c2071011b0e5de8b80407998e7
outline-item-above = l’élément au-dessus
# en: 973c239ffbd8d0522cea9cfa9e2664d2a96a2e01
outline-this-item = cet élément
# The templates: their names and blurbs (templates.md says what each is for).
# en: 5c3a8ec4fdc8ab96e7ef9f3a0739b0639c6ca926
outline-company = Une entreprise
# en: 8a7edf5c70300a3c146de3a15b534939e72226da
outline-decision-tree = Un arbre de décision
# en: c59b4e8c614eaaf02a0ac81499bc50947192118e
outline-family = Une famille
# en: 3ac1f9e665cb59f3a08ee0fba150dbbf4aab85a8
outline-five-minute-retirement-toast-opening = Un toast de départ à la retraite de cinq minutes : une ouverture, trois histoires, le toast, chaque partie chronométrée sur sa ligne.
# en: 9ed550a11b44d369413c1b004a5008d3c127a6c1
outline-novel = Un roman
# en: 35c9710d58daeb1aebb2143cfaeda278f0f67311
outline-product-launch-product-marketing-and = Un lancement de produit : le produit, le marketing et le support dessous, avec des liaisons entre les branches.
# en: 79fd5c646ff9b077d10357db663c9b7d59acb64f
outline-research-plan = Un plan de recherche
# en: 6a1ae380627dbc8fe79ff6a208c76b89d230979e
outline-speech = Un discours
# en: f081caaa6b5cd7b0858a4a87cc6f81bdb215fd30
outline-syllabus = Un programme de cours
# en: 5b163ae0d9a3fd9b5ab6a8b6c27374091ceb25de
outline-ten-week-course-when-and = Un cours de dix semaines : quand et où, un sujet numéroté par semaine, comment il est noté, et quoi lire.
# en: 9cea5f42a5742d9eef722836a7a7b59c6a5c0c5a
outline-thesis-two-arguments-with-their = Une thèse, deux arguments avec leurs preuves, l’objection et sa réponse, et la conclusion.
# en: e5f2a2c3f76b55d5786f1c311773def62d6920f3
outline-essay-plan = Un plan de dissertation
# en: d926d538e1be8112e81292507985514feac5e4c4
outline-draw-as-family-tree = Dessiner en arbre généalogique
# en: bfef6f97dfb8178f726a96b8861bc2536e8c6fb4
outline-five-days-in-lisbon-packed = Cinq jours à Lisbonne, rangés par catégorie, avec ce qu’il faut faire avant de partir.
# en: 987acdf86bb6a373c995aa374c004bb21bf2e576
outline-indoors-or-out-for-saturday = En salle ou en plein air pour un marché du samedi : les réponses à chaque question sur ses lignes, oui et non.
# en: 61390a6b5d7d9268827d91b4a818c6a5fbe2011c
outline-no-internet-at-home-question = Pas d’internet à la maison : une question à chaque étape, oui ou non, jusqu’à l’appel à passer.
# en: b431e4b41d5021ff680bdee33aebda8738cec5b0
outline-packing-list = Liste de bagages
# en: 013532bb7e7d08afa22a3149f8e74b5ee4d9eaf5
outline-parts-and-chapters-of-book = Parties et chapitres d’un livre d’idées, avec une ligne sous chaque chapitre pour ce qu’il soutient.
# en: 5f646cfc8f40ae2515c9d774ae5ad523f524b998
outline-people-and-three-acts-of = Les personnages et trois actes de chapitres, chacun avec ce qui s’y passe, reliés là où un personnage change de chapitre.
# en: dbb00953c7a1565bffce71190cfb90220362c471
outline-question-method-budget-that-adds = La question, la méthode, un budget qui se calcule tout seul, un calendrier, les risques et les lectures.
# en: 57b065618d9af543d6fcc5085edd94aa723f8403
outline-three-generations-and-next-each = Trois générations et la suivante, chacune avec ses années, dessinées en arbre généalogique depuis le menu.
# en: 285ec850c11d78bac10f6bfa31b69a37f1b257c9
outline-troubleshooting = Dépannage
# en: c126bf3ee80a183d7c300cd69a01e39ab7dd8e53
outline-who-works-for-whom-at = Qui travaille pour qui dans une boulangerie de neuf personnes, chacune avec son rôle, en organigramme depuis le menu.
# en: 0c6266451117f0382231513e4c30d38fb976086e
outline-pdf-sections-and-bullets = PDF : sections et puces
# en: 32897da2f696f1ddc73da9ef0575827530a80b1a
outline-fold-unfold = Replier ou déplier
# en: 74341e3c271df3c784e595b804b1f90be0f80429
outline-name-line = Libellé

## the Presentation Builder

# Its templates: the occasions and a second of each printed format.
# en: 44467d7b18daac8d8100b68ebc482fe0ee0ac9b6
deck-choirs-winter-concert-welcome-both = Le concert d’hiver d’une chorale : l’accueil, les deux parties, des notes sur la musique, les chanteurs, et les paroles à chanter en chœur.
# en: a816093d69f08b81c457d818e6d1bd72e0915b10
deck-lesson = Une leçon
# en: e2d04797e440ee0933d032a29cfbfad5edbc99c7
deck-lost-pet-poster-in-red = Une affiche d’animal perdu en rouge : le nom, son allure, où elle a été vue, un numéro à appeler.
# en: 4d44cafa1d032ca3ceda90fa9830717ea5cf8491
deck-morning-workshop-schedule-checklist-of = Un atelier du matin : le programme, une liste de ce qu’il faut apporter, les étapes, et la suite.
# en: 7dc13283809d7ed9c506873aee1486fd988cfe5c
deck-pick-your-own-farm-what = Une ferme de cueillette : ce qui pousse quand, comment ça marche, les prix, la grange et comment la trouver.
# en: b822b42bfed453711aed6a262083b2a7aef5cd89
deck-pitch = Un pitch
# en: a9964d2d4aae75e70e2e8dace25022b6679f25d7
deck-product-in-sentence-what-it = Un produit en une phrase, ce qu’il fait, les prix dans un tableau, les dates de lancement et le contact presse.
# en: a46e6eb74ae783d7eb35ae76afc5ab984683886f
deck-trivia-night-in-four-rounds = Une soirée quiz en quatre manches, un tableau des scores, et les réponses sur la dernière diapositive.
# en: efebc637859160a6f694e66576eebb294de14712
deck-residents-meeting-about-new-playground = Une réunion d’habitants sur un nouveau terrain de jeux : pourquoi, ce qui est proposé, le budget en camembert, quand, comment donner son avis.
# en: 02e7a62fc65ed26cb0751706a5ea8f5783414eda
deck-science-lesson-on-chalkboard-aims = Un cours de sciences au tableau noir : objectifs, ce qu’ils savent, le modèle, une vérification, des devoirs ; les notes de l’enseignant sous chacun.
# en: f3a66c7b2a6ebda85ea74938fce4c397eae2a131
deck-seed-pitch-in-eight-slides = Un pitch d’amorçage en huit diapositives : le problème, le produit, la traction sur un graphique, le modèle économique, l’équipe, la demande.
# en: aab8da6eadee157bba3937e9dc00741cfe48b13f
deck-bike-shops-quarter-for-its = Le trimestre d’un magasin de vélos pour ses associés : le chiffre d’affaires sur un graphique, réussites et ratés, les chiffres qui comptent, le trimestre suivant.
# en: d0fa5e5696edaf949dfe9e739a7a2eef0d433ae2
deck-small-story-in-panels-about = Une petite histoire en cases sur le prêt d’un objet à un voisin.
# en: 6c1ff81a2445a9eab1616588060b483cd5b6cde8
deck-twenty-minute-talk-with-speaker = Un exposé de vingt minutes avec des notes pour l’orateur sur chaque diapositive, un graphique des résultats, une note de bas de page et les enseignements.
# en: 1a2fac58a0b80e771b6d2e526e7d3fee2cf6ef85
deck-badges-for-conference-each-with = Des badges pour une conférence, chacun avec un rôle et un lieu d’origine, dans le style Océan.
# en: 7aa6a43fffd387b34fc7d06c7845de3f5bef745a
deck-comic-umbrella = BD : le parapluie
# en: 1796880ad702715de60aad7227c9bdca655f0fff
deck-concert-program = Programme de concert
# en: 3843bc86872f81764fe670a10bd1192b5a78018c
deck-conference-badges = Badges de conférence
# en: cae2fc32956e250bfadb1c6411ff593e325cf580
deck-conference-talk = Exposé de conférence
# en: 27fa527134938f2343573a9c4485c57bc7e6167e
deck-farm-brochure = Brochure de la ferme
# en: 6bd753630675cfdfe68c546580b14419bd8e80a4
deck-lost-cat-poster = Affiche de chat perdu
# en: dd7cf099a356a9e69908104ae2d8c2743ba41fb7
deck-product-launch = Lancement de produit
# en: 68d708c4452b9eaca2d5d38e9d0a5848059fd138
deck-quarterly-review = Bilan trimestriel
# en: ca40a6181df561c65b71e9ebdf580ccae6b007b7
deck-recipe-zine = Zine de recettes
# en: 02bfd82260b75fe685e4e972cb9a3ae9b0a42f5f
deck-seven-soups-for-cold-week = Sept soupes pour une semaine froide, une par page, dans un zine plié à partir d’une seule feuille.
# en: 44b5c7f041391d8b41a8ba365b6f13522877b478
deck-their-story-for-reception-from = Leur histoire pour la réception, de leur rencontre à la demande en mariage, avec une frise chronologique et un merci.
# en: 2aaeb944a6b05f452d512dc7dd5220adeee294ea
deck-town-hall-notice = Avis de la mairie
# en: 14444c384d263fff25ba48b195abb55def791b75
deck-trivia-night = Soirée quiz
# en: 0377beb012ed13e1986227ef8915aeab709ad5d9
deck-wedding-slideshow = Diaporama de mariage
# en: f34f4184c545fd4fec60bbc441ead88d1f1fdd1b
deck-workshop-agenda = Programme d’atelier
# en: e4c8d951f1cc300d96873c7cfc850ad0f0ddaab4
deck-presentation-lowercase = présentation
# en: 1e35470a39e5b3ddca4d3b585c9011db9b4c4dc6
deck-slides = Diapositives
# en: 5075541433d31fb8cf207ced97577686ac3fe961
deck-chosen-slides = Diapositives sélectionnées
# en: d7935967cfd3de8f11b33801800bece8d90cb55f
deck-move-this-slide-drag-it = Déplacer cette diapositive : glissez-la sur une autre
# en: 19926fc5c47a7a39dd1435da06e3fc4c027458ea
deck-slides-titles-bullets-two-columns = Des diapositives : titres, puces, deux colonnes, grandes icônes, autres documents sur une diapositive ; ou un zine, livret, brochure, BD, affiche ou badges à imprimer et plier.

# The layouts, the transitions, the formats
# en: 7509c5747e5db3dfa3373afc42eca9f5b27a8599
deck-bullets = Puces
# en: 8d8f0f25822179c33b917613ec2d022ef593c340
deck-two-columns = Deux colonnes
# en: 1d6bece457daf37f906239468dadfdfb619adb98
deck-big-icon = Grande icône
# en: 5298d08bb7ae7d01f4efcdbb94ff03fc487fd11c
deck-fade = Fondu
# en: 38d13bda5c40afc32d629f81dec6c156cbea328e
deck-cut = Coupe
# en: 38d13bda5c40afc32d629f81dec6c156cbea328e
common-cut = Couper
# en: a5d5b46a7720824b51da4be0af97f5cfd1168cd0
deck-slide = Glissement
# same
# en: 9b3cbed5c490c07473546a88768ba29b787e9e52
deck-zoom = Zoom
# same
# en: d4ff278598ebbd3f36cecf27e68c66de49d2f62f
deck-zine = Zine
# en: 8ef5c45547ec6440e6dde4870e3f92d6c08dfbaf
deck-booklet = Livret
# same
# en: 80dceb58c1f9daca0ebaa066d80e670cfdf1123e
deck-brochure = Brochure
# en: 5549c5222b1b1eb52e37ae3542dcc0f7cb9fd376
deck-comic = BD
# en: a33539ca77a6c42fd7a1e50aef1516b3a87d7c85
deck-poster = Affiche
# en: be13a787e958beeb3139d8e1b3ebc2b879732db2
deck-name-badges = Badges nominatifs

# The themes (the Look menu) and the icon colors
# en: 34118050b206b7ee3e5bcb8e4adbe8c17630020d
deck-plain = Simple
# en: b6369ed60eb9bda1aa642868ddfb5053547f0206
deck-boardroom = Salle du conseil
# en: 39973be20679a94e4c998a58c0f6c76daaf6cd11
deck-ivory = Ivoire
# en: 558287ddcc3557b09ec00ca17b3e4be7e6645858
deck-midnight = Minuit
# same
# en: 220c98deb1482e5b5361b123b929ee8e4ac1e18d
deck-graphite = Graphite
# en: 79141e063e10bb80a7b799878f12312eb89fbafd
deck-confetti = Confettis
# en: 181bcd5760fd32163554c899301a30b2cd381cf4
deck-sunset = Coucher de soleil
# en: 76022a00a16b0482beec04274945ed192a931410
deck-ocean = Océan
# en: 07a59415416c4f5915d5efbe6319ca69450f0a77
deck-bubblegum = Chewing-gum
# same
# en: bc727a101b60bbc2b4f96365ecf1ee4bd1db685a
deck-arcade = Arcade
# en: 5efe442a0ed9b1e51ec7e85696d66d6ac3db83a8
deck-chalkboard = Tableau noir
# same
# en: 5f941ab65fbabe87f41cd73c9136f5a4c97087e8
deck-fun = Fun
# en: 0bd48966c3fe51c025c34a472af7fac64b2292dc
deck-themes-color = La couleur du thème

# The bar
# en: 4e9f7a31eef4c69e0aacb643f6856372cd6e3247
common-present = Présenter
# en: 3c47e73f6a8bcb018bdbe91d9312e8e1777050f7
deck-see-sheets-to-print = Mise en page pour imprimer
# en: ca742a9ecf2f35a59704398ead009f1d8e554a0c
deck-back-to-pages = Retour aux pages
# en: 442250df38e5e516ff1c2ce97d051b8997c7d976
deck-headline = Gros titre
# en: 1cd715cdb2322da76e4ce7f490064782c83337b2
deck-layout-layout = Mise en page : { $layout }
# en: e85e5488b4184d6cfb4c0aa36e169a271068ec0f
common-look-theme = Style : { $theme }
# en: 896afdc59964bf4da2b261b6056d23286d186427
deck-transition-transition = Transition : { $transition }
# en: 438dcf262325319835f0d0aefa8a4ecddaf49a16
deck-format-format = Format : { $format }
# en: f16eadab2a72ff13044cc806dbcf2c117b32244f
deck-printing = Impression
# en: d5939283a7a53a72f09e4f327bc22f2872b64257
deck-one-sided = Recto seul
# en: 256dd8b8869a6c72f553a2905aef393f2b39df0d
deck-fold-and-cut = Plier et découper
# en: 8cb849ee6e612fbad8641d053d8e66b2ba560a1b
deck-two-sided = Recto verso
# en: b82a2c3204554a9c0a82b44aa7eb5f94916b1c13
deck-cut-and-nest = Découper et emboîter
# en: 6e19d7b7deffd2974f632ec3e697646de978130e
deck-end-with-qr-code-of = Finir par un QR code de cette présentation
# en: 0c7dca360d478b76246b0ddf594aed2299af3ef2
deck-move-slide-up = Monter la diapositive
# en: 8e87a8ca3749be93e307f172d62814c1b58865b4
deck-move-slide-down = Descendre la diapositive
# en: 3a260e90c0d893d60ed227c10bfade84b5a2adef
deck-delete-slide = Supprimer la diapositive
# en: e984a8f80b4d34ad2ca73e2a3a432a6a08a6db27
deck-move-page-up = Monter la page
# en: 21c3799bf3525e9642bab926aa4f81f07a5d8a0f
deck-move-page-down = Descendre la page
# en: 260b69625056e26e4029491cf672306054bf10a6
deck-delete-page = Supprimer la page

# Insert
# en: fffd75e48f61364f8486681ac4213184abd2373f
deck-bullets-slide = Diapositive à puces
# en: 6e281f49affc0fc305e572fc6d08a6ca82a597a1
deck-title-slide = Diapositive de titre
# en: 8401be1cb1b1122b954639aeea6e348e2c709b23
deck-two-column-slide = Diapositive à deux colonnes
# en: ecca8f3f7107aaa37ae2674734c101faac7e3e11
deck-big-icon-slide = Diapositive à grande icône
# same
# en: fb06270f7c212baabc8749ffc36e49dc8f321548
deck-page = Page
# en: 31f820710f9d6c3e03e8b9e5996902c45a8816da
deck-title-page = Page de titre
# en: 9b0d34e9841a2c5fa15e4c9e68c01f338dc34930
deck-two-column-page = Page à deux colonnes
# en: cfdc49e689f75ddfc0372d83f7c9a396b6616dd8
deck-big-icon-page = Page à grande icône
# en: 17a4bbb4cefcb0a1fccf38f1c561b2a18fe44456
deck-four-more-pages = Quatre pages de plus
# en: a59879f8796236335931a0b95f1cb1a1db39e210
deck-on-slide = Sur la diapositive
# en: 9bab04556dc2a912d86a00f7b4dcd7c540468b8b
deck-on-page = Sur la page
# same
# en: 600584c2d5ccb97c0c0c424d9f32d6b102fcb040
common-pages = Pages

# The canvas
# en: 028137d1d6f1cf21777ce8a83b467b80e04a6168
deck-add-icon = Ajouter une icône
# en: f68895d5ec9c6f1865e9ee69f1d423cbfd251599
common-change-icon = Changer l’icône
# en: fd8de0a92eedac5ccdf6c587b3ae177b97da0ae0
deck-pick-icon = Choisir une icône
# en: 3805391efb1ea53cff43e62a0dc134be9b14bd8d
deck-left-column = Colonne de gauche
# en: e8965b7c19d1ad62de75e624088e40b37d16f206
deck-right-column = Colonne de droite
# en: 58952208e1b00c3e046eab00b1e20bb448262df9
deck-one-bullet-line = Une puce par ligne.
# en: a32090c9358d8e112f4074c11a76811a50d53d5c
deck-one-bullet-line-tab-steps = Une puce par ligne. Tab l’indente.
# en: f8948a4a523b4312c5567f9cff1f6788c757998f
deck-line-or-two-under-title = Une ligne ou deux sous le titre
# en: 236bcf1c6a83d3b0f85a065c777d7948b22a0c22
deck-what-this-page-says-type = Texte de la page. Il rétrécit pour tenir dans la page.
# en: e80e281dac24d9c4c3f60dcdbf8700e9603b825e
deck-panel-line-what-is-said = Une case par ligne : ce qui est dit | la légende. Icône y ajoute une image.
# en: 3d6e76c9325034deb76b92c8cc47a2d3c22fcdf3
deck-speaker-notes = Notes de l’orateur
# en: f0ea152b4f68c54e5bc3476bae70301bc7fb2523
deck-n-total = { $n } / { $total }
# en: 3b73ff036c4ba5dc509f9a2e55189b33fc8013bb
deck-document-on-slide = Un document sur la diapositive
# en: 800ddde9b84d77765694212f6af1a9ed4329c77c
deck-remove-from-slide = Retirer de la diapositive

# The rail and the sheets
# en: 7e4475e68efd3a93e2aa3ad794afd9388b4c89d1
deck-slide-n = Diapositive { $n }
# en: 5f78f871f6b48ae876a1dbe89a5b8bff6f6b9849
deck-front-cover = Couverture
# en: 95842f717432a63230077bc5ea48addf5bc52947
deck-back-cover = Quatrième de couverture
# same
# en: 10e4725d5544e065501162abcf8a53b94451df0c
common-page-n = Page { $n }
# en: dd19f9887573a9f06294de48329bfb1b3a5ad273
deck-front = Face
# en: 6f453fd2a404a86955b0f23219d84f2bcb4e7d06
deck-inside-left = Intérieur gauche
# en: 4fe87c5667532867fc721531b92a7ca6b391eb8a
deck-inside-middle = Intérieur centre
# en: 3e654f345b202e7b158b2c61ff91fe55b0d3d46d
deck-inside-right = Intérieur droit
# en: 418bf9a5530258c65b3dbc1f932667dafa01469c
deck-inside-flap = Rabat intérieur
# en: b52b36b7269fbfc58ec24bb724691951a3decbe8
deck-back = Dos
# same
# en: 3369aa225b34e01144a4c49dd350db04732a2720
deck-badge-n = Badge { $n }
# en: 9cc25309d07de0adfb989faaaaa74f7cb5a06e38
deck-last-slide-added-for-you = Dernière diapositive : un QR code de cette présentation
# en: 03c90c8e6a7e028c2e9caeadc1961fb5c0ad4e57
deck-ends-with-qr-code-of = La présentation se termine par un QR code pour que le public puisse l’emporter. Le bouton QR désactive cela.
# en: 13c7cb226b093919972f5e423aeb0abae93960cf
deck-qr-code-of-this-deck = QR code de cette présentation
# en: 5d5bc5601280c776405941347bbf7e9c63dc3954
deck-sheet-side-n = Feuille, côté { $n }
# en: 1982f74c2102a55783a4774ddd4895dc7fec26f0
deck-cut-along-dashes-this-half = découper le long des tirets · cette moitié va à l’extérieur
# en: 0fc0c2932d66df46e1af55ac50d98be2bccd63c3
deck-print-on-back-flipped-on = imprimer au dos, retourné sur le grand côté
# en: e0226944c5e9e4df97a3bf718ac488a8a51118fa
deck-cut-along-dashes-fold-along = découper le long des tirets · plier le long des points
# en: b0ccda7ec0d37c14d00e5e9f57eeadcb1045ebd7
deck-print-it-double-sided-on = Imprimez en recto verso sur du papier Letter, en retournant sur le grand côté, à taille réelle. Découpez le long des tirets, posez la moitié du haut sur la moitié du bas, et pliez-les ensemble au milieu.
# en: 7d7f71d31c8968c0555f49f9430133796d626c4f
deck-print-it-on-one-side = Imprimez sur un seul côté d’une feuille Letter, à taille réelle. Pliez-la en deux dans le sens de la longueur, puis en quatre ; découpez les tirets au milieu ; rapprochez les bouts et pliez-la en livret.
# en: ce30358159a7953f092af19e48f7dad47608c83d
deck-print-it-double-sided-on-letter-paper-flipping-on-short-edge-at-actual-size-stack-sheets-in-order-first-on-outside-and-fold-them-together-down-middle = Imprimez en recto verso sur du papier Letter, en retournant sur le petit côté, à taille réelle. Empilez les feuilles dans l’ordre, la première à l’extérieur, et pliez-les ensemble au milieu.
# en: 96bf1a2ba3e6d649669efc225b3104521735ff25
deck-print-it-double-sided-on-letter-paper-flipping-on-short-edge-at-actual-size-fold-right-third-in-then-left-third-over-it-front-is-on-top = Imprimez en recto verso sur du papier Letter, en retournant sur le petit côté, à taille réelle. Repliez le tiers droit vers l’intérieur, puis le tiers gauche par-dessus : la face est dessus.
# en: 6d4cc8d4405840522000283a7e419c1c93e89392
deck-print-it-on-letter-paper = Imprimez sur du papier Letter, à taille réelle.
# en: f81a8cbfa80cae20e64c2c1dd92fec6cfefba6c9
deck-print-it-on-letter-paper-at-actual-size-cut-along-dashes-six-badges-sheet = Imprimez sur du papier Letter, à taille réelle. Découpez le long des tirets : six badges par feuille.

# Presenting, and the closing slide
# en: 6e875951a6f9aa1374d93572de657c12ded57355
deck-presentation = Présentation
# en: 50f94286ba30706a19070d3ec0a0c8d34d6cf6eb
common-previous = Précédent
# en: bc981983e7f547dc62e19a1e383acfe00782a6d5
common-next = Suivant
# en: 10225bffa1614015caa499978578b424eb0ee56f
common-stop-presenting = Arrêter la présentation
# en: 1380030776f8bb0e462fd6e828a563e49da50652
deck-slide-n-of-total = Diapositive { $n } sur { $total }
# same
# en: 70440046a3dc2e079f23ee1c57dfa76669b732aa
common-notes = Notes
# en: bd0dad7cbf71b13b2e545d8ce477027ffc106b45
deck-n-hides-them = N les masque
# en: 45c44dc2566819f835fd788e2b7a6c5bee5177c4
deck-take-this-deck-home = Emportez cette présentation
# en: acc1edc431e346786fab17d4f10e195ca72257d6
deck-take-this-deck-home-title = Emportez cette présentation : { $title }
# en: 7fc2d8c7fd4164039149b5a9f2063ddf7ab9d76a
deck-scan-code-whole-deck-is = Scannez le code : toute la présentation est dans le lien.
# en: a0f82f698bc01f5dc90c760db684589e2d8277eb
deck-a-qr-code-of-this-deck = Un QR code de cette présentation

# Downloads
# same
# en: a149055ecee5f95be2951f0b5454f3d1ef47c786
deck-powerpoint-pptx = PowerPoint (PPTX)
# en: 7660a22bdc9507edd353dd61198b9aa86488d936
deck-picture-of-every-slide-zip = Une image de chaque diapositive (ZIP de PNG)
# en: 98a41f54e049532b6032b88d7656348adc178c2a
deck-animation-of-deck-gif = Une animation de la présentation (GIF)
# en: 3bab526d831e1024e6f8e7d197f9c3d72cc4f0e4
deck-film-of-deck-webm = Un film de la présentation (WebM)

# The templates
# en: e5604bc465a212ad3d7f4e13ed282f030d9d3a6b
deck-title-agenda-three-points-with = Titre, ordre du jour, trois points avec notes pour l’orateur, et une conclusion.
# en: 60c974074604818e661eff7940285669d1496647
deck-status-update = Point d’avancement
# en: 34714be3698c31c72afb1d4d4b8a7b0c69f30fc5
deck-done-and-next-side-by = Fait et à venir côte à côte, puis les risques, puis les demandes.
# en: e946db45d2689df95cbac9f8137664409c51f5d8
deck-proposal = Une proposition
# en: 52ab7599cc26432ef9b492b401d04eee1ca5e699
deck-what-you-heard-what-you = Ce que vous avez entendu, ce que vous proposez, quand, ce que cela coûte.
# en: b8e1f28fed63f996c8915470a7ee9ce8aef9b75f
deck-eight-small-pages-from-one = Huit petites pages tirées d’une seule feuille : à imprimer, plier et découper, ou à feuilleter d’un toucher sur un téléphone.
# en: 31b11edde49cd1bd80a198f240426c5b2d8cd65f
deck-booklet-of-half-letter-pages = Un livret de pages demi-Letter, de huit à vingt, mises en page pour imprimer, emboîter et plier.
# en: ae07389f7b537dbd7eb3007d3f2b36ca3c35c404
deck-trifold-brochure-six-panels-on = Une brochure en trois volets : six panneaux sur les deux côtés d’une feuille, chacun là où le pli l’exige.
# en: 88c71dbca35b2e7c498adce21174cb1102af384e
deck-mini-comic-panels-with-picture = Une mini BD : des cases avec une image, une bulle et une légende, pliée à partir d’une seule feuille.
# en: e610bb7f6eac1dd5622723ccc779e31e9d9ed190
deck-poster-or-flyer-headline-and = Une affiche ou un tract : un gros titre et quelques lignes, aussi grands que la page le permet.
# en: ec024ffdc152af00e77f7219a5293545bdd3bb65
deck-name-badges-for-meetup-one = Des badges nominatifs pour une rencontre, une page par personne, six par feuille, prêts à découper.
# en: 9a51ba7142888f3e0199896de291a1fb4b4298f1
deck-edit-this-deck = Modifier cette présentation
# en: d5947c525ed0d53dce794385a2cc1cd6e2459dbd
deck-new-slide = Une nouvelle diapositive
# en: 720856fcb53d62f79a364c36d8cd2314121430a6
deck-presenting-back = Retour (en présentation)
# en: a212c73bb85a53b57609d239c50f170773e07d77
deck-presenting-next-line-or-slide = Ligne ou diapositive suivante (en présentation)
# en: e53a09169fa399b79b5b814de5e65669714f9165
deck-presenting-whole-slide = Diapositive entière (en présentation)
# en: 7722768d8b861ddedb1f6400352985ca0cfd4a08
deck-slide-before-slide-after-on = Diapositive précédente ou suivante

## the Calendar app

# en: e4ffacba5591440a14a08eac7aade57c603e17c0
cal-calendar = calendrier
# A span is an event on the calendar or a task on the schedule (the Gantt view); { $every } is "Every week" and the like.
# en: 11fcad4bfe2782393e5d2ac5e04d65349890ea94
cal-name-yours-say = Un nom (le vôtre, par exemple)
# en: e288d42e3bba2f9fc3b7f2287d2ea4f141e72236
cal-schedule-phases-with-their-tasks = Un planning : des phases avec leurs tâches dessous, l’avancement de chacune, le lancement à la fin.
# en: f0424f3e15f33d07de80ddfd02a4b56f047767d7
cal-week-earlier = Une semaine plus tôt
# en: 5e63d8681fdc3170ed99fc3abcc3668620f299ca
cal-week-later = Une semaine plus tard
# en: ab455a2fb151da1c7d0c39c7534c2f935e028ce9
cal-weekend-of-sessions-at-set = Un week-end de concerts à des heures fixes, un dernier set après minuit.
# en: 114574336ac7883aebd0653b3fc5e82f9262dc86
cal-all-day = Toute la journée
# en: cbf28df446643f9968f7fe68968bca51be5cf792
cal-chart-scrolls-sideways = Diagramme (défile horizontalement)
# en: a13d5b9d3da48c8bade3d645e0de9a9bb812c648
cal-color-for-new-color = Couleur des nouveaux : { $color }
# en: f6bb0f468a8569c67b3d6826e57e62c5500c3681
cal-days = Jours
# en: b50e483c45f8f17795b63f822127ff0171086900
cal-days-and-times-on-month = Des jours et des heures sur un mois, une année ou un planning, dans n’importe quel fuseau horaire.
# en: 9ccd3e7bb11493f1e93950f7db9148a4794037b7
cal-done = % fait
# en: a7028454f240815938eaf701823b7d55dbaf98a9
cal-edit-event = Modifier l’événement
# en: 8a4d4e6eb9a367d616b8a4cbfa2792068482e884
cal-edit-task = Modifier la tâche
# en: 99570f85bb2bae0dbe3e8f2f3d6d6f765ee7c47e
cal-choose-task = Sélectionner { $task }
# en: 72b4644a41881ce4e156ce3283119c74f598cbea
cal-day-earlier = Un jour plus tôt
# en: 8d6915ee723c8b3c01f29002cfed7d597d56c2c7
cal-day-later = Un jour plus tard
# en: 66a755ea0d935aeac763da63deebb69b0eb54ba9
cal-dates = Modifier les dates…
# en: a2bb9d34b8a1a79665858d354585cf147e0dee4e
cal-end = Fin
# en: 89d10cd6c1e1437d6318d6fbb25a40e0aaaddd34
cal-end-date = Date de fin
# en: cd7800da7f4ff94a0e14445d7f94b6345d1b7b8a
cal-end-time = Heure de fin
# en: 91856dcb7d93f9c6725649160ab6abe379d8e5c9
cal-ends = Se termine
# en: ad8919ace091b14011c6439cfd5e1707b58f5abd
common-event = Événement
# en: 3b2eb5131055ad07ac1d08de2f11f900286a51b5
cal-every-day = Chaque jour
# en: 7f3932f9cb96cb99072771c992c0ce3c0b342bfb
cal-every-month = Chaque mois
# en: 043058e2050c0345ef7aac78bd9025d3adce099a
cal-every-week = Chaque semaine
# en: cea537cd72239840db0466ba29562d222299f7ce
cal-every-year = Chaque année
# en: 557ea666ac9eafe1543ea9c4423073c8be815d79
cal-family-calendar = Calendrier familial
# en: 05061b43a7c1a210598d8a217347a96fdb45df8d
cal-festival-weekend = Week-end de festival
# en: a3f5851f7cb29b64859b01ec6429ea85811bb192
cal-how-many-times = Combien de fois
# same
# en: 834c5ef85d6fd469b8be75d8685faf6f9e84eaa7
cal-icalendar-ics = iCalendar (ICS)
# en: 4bcc328bf3b5b886738db678a175936615491289
cal-its-own-zone = Fuseau horaire du calendrier
# en: 2a177256a408fa4fc557b301041589b798826d70
cal-last-day = Dernier jour
# en: 58ef633830b461aa76bf4ee90e3b2831ff588508
cal-lessons-birthdays-and-holidays-color = Cours, anniversaires et jours fériés, une couleur par personne, et ce qui revient chaque semaine.
# en: 7c7f5d049fad2569721d446c4a811f9bd5da5393
cal-level = Niveau
# en: 082bc378cd60e17a38d99898b21955299c5b60c8
cal-month = Mois
# en: 770d509550265dba792aa81868b856eb67225e41
cal-my-zone = Mon fuseau horaire
# en: 80c3052d33ccdee15ffaaa110c5c39072495fe63
cal-never = Jamais
# en: 2ef3795c979293106a6ccf13359d732165fb660a
cal-new-event = Nouvel événement
# en: 25d3553217b2058be97b5339fbe6a576cfeb6856
cal-new-event-on-day = Nouvel événement le { $day }
# en: 17b2b838c5ce22c961a36736534a5029d6ba0087
cal-new-task = Nouvelle tâche
# en: 8abf7cf1d0b36ff16ebbe26b8285a65d9d1582f6
cal-next-month = Mois suivant
# en: 22c6f667e4103029954aa28d43a1d4888122b35f
cal-next-year = Année suivante
# en: 1562a21cadb04e59b670cb3e32fb54f1777db699
cal-no-tasks-yet = Aucune tâche pour l’instant
# en: 3b2069a4f745374e50f8992752888822ce851db4
cal-no-tasks-yet-insert-task = Aucune tâche pour l’instant. Insérez une tâche.
# en: 855dec4a50f5117b51b7f32b59771f28855942ac
cal-nothing-on-calendar-yet-tap = Rien sur le calendrier pour l’instant. Touchez un jour, ou glissez sur plusieurs.
# en: 27d7bd5f744f76fc1ad85bbe975e9fdca473eaeb
cal-nothing-this-month = Rien ce mois-ci.
# en: 46a299215300b3a0de6931f926bc6b0f2283eb99
cal-previous-month = Mois précédent
# en: 2f866c70871d37f90c24fefa28d87cc19d8850c3
cal-previous-year = Année précédente
# en: 580110a84277d369b216be5a01a5ba50868d4d3f
cal-project-plan = Plan de projet
# en: 6ae5ee3e66205a8b1a41c80c4db0dcc982e50f44
cal-repeats = Répétition
# en: 0a8adac9d6d5f4d14ee887d196cd8618f0f3391a
cal-schedule = Planning
# en: e7fe53f0503eb82f8c80f9b233fa566339a9f9e8
cal-show-times-in = Afficher les heures en
# en: 952f375412e89ff213a8aca383d18e5691354347
cal-start = Début
# en: ff99f5b5f7948dfa71fd545b3d99f5f00856ea29
cal-start-date = Date de début
# en: 88d8206d586abe4c8e35c8e9adcc649d07c99a1e
cal-start-time = Heure de début
# en: fc612a2fcc722bde9d98ae18bea42764812b6784
cal-starts = Commence
# en: 0e648419ea806b0cc4db81617f95870a094f3639
cal-stops = Se termine
# en: 480b9be2834a2278919632171f788a9a80d5d743
cal-same-dates-as-gantt-chart = Les mêmes dates en diagramme de Gantt
# en: 7ea6dec71584012ab4044cc464dc601741ff2c50
cal-this-calendar-is-written-in = Ce calendrier est écrit à l’heure de { $zone }.
# en: e10c10f818ac8e510b74062cde201eae4e8d8c66
cal-this-calendar-names-no-time = Ce calendrier n’a pas de fuseau horaire : les heures s’affichent donc dans le vôtre ({ $zone }).
# en: 1b4785331db3b08cd8e3cfa4bd36216731a79e54
cal-this-month = Ce mois-ci
# en: eea79afd832854a3b24153b928ee9c62c7457dbe
cal-time-zone = Fuseau horaire
# en: bf5efde33adface92f37d1888e904ab70c9ce272
cal-times-in-zone = Heures en { $zone }
# en: 650642b1d6b4b1ecc4ad7d38bbdf110d582c4baf
cal-times-or-on = fois, ou jusqu’au
# en: 69bd4ef9fbd0894a22759c3766b859defbdedbc8
cal-view = Vue
# en: 97211a8888128314d9ca34d1005f08cb83ed5d9c
cal-what = Quoi
# en: 879e32326c5217968ac8e3a14e4a8a5214957264
cal-year = Année
# en: 6189fbfe149a418e2f6d1af4dd71b04f6aa0c50e
cal-color-stands-for = { $color } signifie
# en: 63e5df0eb2fcd351c1d31f23cdf3bf4816e3def5
cal-every-until-date = { $every } jusqu’au { $date }
# en: 519c383aaa892cfff62e992bb947ec79ed5dd57d
cal-every-n-times = { $every }, { $n } fois
# en: d69842d42eceddee8c62019d22d4f7ca383cf847
cal-n-days = { $n ->
        [one] { $n } jour
        [many] { $n } de jours
       *[other] { $n } jours
    }
# en: 0cf851711322b556de4e3e932cdf083d7444c723
cal-n-done = { $n } % fait
# The templates: each name, then its line on the home page.
# en: 71428a822d08efae1d13babd6073592abec99d1f
cal-bakerys-posts-and-newsletters-through = Les publications et lettres d’information d’une boulangerie tout l’hiver, une histoire de l’Avent chaque jour.
# en: 91dad831b9be334af672cd6052e37dedde16d06e
cal-youth-soccer-season-practice-every = Une saison de foot des jeunes : entraînement chaque semaine, matchs à domicile et à l’extérieur dans leurs couleurs, les phases finales.
# en: d7bad656f3b06c3ee989a1f2960214ee15b2f788
cal-small-teams-time-off-public = Les congés d’une petite équipe, les jours fériés et la fermeture de Noël sur un seul calendrier.
# en: cd6036648af6d0d5614f0ec65eb732300281e059
cal-community-garden-plots-year-when = L’année d’une parcelle de jardin partagé : quand semer, planter, récolter et tailler, chaque année.
# en: 1b04e3c7d585a3d6297852d158919c9833538a01
cal-fall-term-from-first-day = Un trimestre d’automne du premier jour à Noël : fermetures, clubs, la sortie, la soirée parents-professeurs.
# en: f80b28faa22109c4d14cf7eb7994768abca09ca8
cal-bills-and-renewals = Factures et renouvellements
# en: 2223281ed9222907f9d00ef35ab71df263d06e46
cal-conference-agenda = Programme de conférence
# en: 87695adec8581b20111f35794592bb162c32e800
cal-content-schedule = Planning de contenus
# en: 072b8e4f3e23cdd58cf0a4b3f5c47437127f131b
cal-editorial-calendar = Calendrier éditorial
# en: 26f861d8db0e97575e814ce9799eaf1bcddec28b
cal-every-autopay-on-its-day = Chaque prélèvement à son jour chaque mois, les renouvellements annuels et l’échéance des impôts.
# en: 2185215436152ae5c1d9429385551e46587c7af8
cal-garden-calendar = Calendrier du jardin
# en: 624b49bb82a8487f3ff77d2098b88b1e1ceb6695
cal-vacation-planner = Planning de vacances
# en: 1ceb786961989ab69eda934e08645ecb19fe5357
cal-league-schedule = Calendrier du championnat
# en: 5a94fcfb3e67abfdd4e3bab4c3d9a2683801245a
cal-school-term = Trimestre scolaire
# en: 2f88af7308e60cbfbe5482a13acec0983b020e09
cal-training-plan = Plan d’entraînement
# en: 5ef83b6b17b42f15d49c31f33e46ca8d4427e6ae
cal-twelve-weeks-to-half-marathon = Douze semaines vers un semi-marathon en planning : base, montée en charge, pic, affûtage, course.
# en: fdab2603fde2488e117cca6335baee3c481231b9
cal-two-days-of-talks-and = Deux jours d’exposés et d’ateliers heure par heure, une couleur par salle.
# en: c8bbdc31a9be182914dd6207c08837389224b33a
cal-two-issues-of-quarterly-from = Deux numéros d’un trimestriel, de la rédaction à la vente, la réunion mensuelle et le lancement.
# en: 0e4753002a6b042b841f5296f0cdb7c71110377b
cal-volunteer-schedule = Planning des bénévoles
# en: f6003458ea2ce51dfa0efa7d0819ccb57ac35bd1
cal-who-does-which-shift-color = Qui fait quel créneau, une couleur par personne, dans une banque alimentaire avant Noël.

## the Diagram Maker

# en: 8737093597f4fbcf30fb6cb5d44b96f338f143c1
diagram-diagram = diagramme
# One app, eight kinds (mind map, org chart…); a 'thing' is whatever the kind is made of: an idea, a person, a step.
# en: a6c5e06888a8fcbcb520ea2a9952009715b62e25
diagram-mind-maps-org-charts-family = Cartes mentales, organigrammes, arbres généalogiques, couloirs, frises, Venn, plans de table et réseaux, dessinés à partir de quelques lignes.
# en: 5c943d9da9c2dfa4508b7318865477cb55850904
diagram-empty-diagram = Un diagramme vide
# The kinds, one of each kind's things (Insert's item), and how a line of each is written
# en: fcb9bd322ef2e2b0e304d49bdafd2842995a47e6
diagram-mind-map = Carte mentale
# en: 2cd7504a5a56c5729f37aca4d0234b698e0c0afe
diagram-org-chart = Organigramme
# en: f78fddbccd57da0c8456fd39da6c21cdc0371020
diagram-family-tree = Arbre généalogique
# en: 5a79fb6ed9e87efcbde2485d08845fe16296c303
diagram-swimlanes = Couloirs
# en: 018514a3d58aa08353dd5e387ee29de45981c409
diagram-timeline = Frise chronologique
# same
# en: e5c282f3e15ca1cf6a0b7837f7c7cd8b2bc12783
diagram-venn = Venn
# en: 840cfb1a1746bbb150371dbcf3ed341983a80c11
diagram-seating-chart = Plan de table
# en: 53ebc572b4a44802ba114729f07bdaaf5409a9d7
diagram-network = Réseau
# en: bd69a4732fe12702d5ff5838852eb29e4a9e2e02
diagram-idea = Idée
# en: 8c41ae88467fe5bbad09fcd488662b25c3ec5333
diagram-person = Personne
# en: dc416e1088e4bf094dfc9abe0210e0288f5a169e
diagram-step = Étape
# en: 448ab73ba1c21e671e218fb91f2644c834f0c16f
diagram-set = Ensemble
# en: ecdda59aea5ee67d7d854c969ccf7f4f4b4a4c54
diagram-thing = Élément
# The picture, and the line editor over a thing
# en: c2e45b49b02d2ac7e1baf25d9d0a2f5c257281ad
diagram-tap-empty-space-for-thing = Touchez un espace vide pour ajouter un élément. Pour en relier deux, appuyez sur Relier puis touchez-les, ou glissez l’un sur l’autre.
# en: d4b16450c157188d2cf2e3968faee3709ebeca28
diagram-tap-here-to-add-first = Touchez ici pour ajouter le premier élément ({ $thing }).
# en: ccdb7bfa4c6b71a69f1931253fe6f892a2baf89b
diagram-tap-in-lane-to-add = Touchez un couloir pour ajouter une étape. Touchez une étape pour la modifier. Glissez-la dans un autre couloir, ou sur une étape pour la suivre.
# en: 639d02ad26e5be80f5baf69835b953dfc015178b
diagram-tap-thing-to-join-name = Touchez l’élément auquel relier { $name }. Touchez un espace vide pour annuler.
# en: 5d36f27a0649ac9ae67fb2e66f5be89ebc4719c8
diagram-tap-first-thing-to-join = Touchez le premier élément, puis l’autre. Touchez un espace vide pour annuler.
# en: 8953058d46b225514231aca0b8643f4e72547676
diagram-this-thing = Cet élément
# en: 53ea183a6bb5ad2942edd6884230b8f425c0eea6
diagram-add-under-it = Ajouter dessous
# en: e9e7205b6f0bd7d9c8f1a1dfe85ef9d54979662f
diagram-add-one-more = En ajouter un autre
# en: be34070c33b5c14155fe70a18891828387dd399d
diagram-add-after-it = Ajouter après
# en: 90d24ab49426f19e75a2b6c3fd9196603c2e0852
diagram-add-step = Ajouter une étape
# en: e0d73143de80d17e82de2e017ac156ca3b9c4e01
diagram-join = Relier
# en: e45795fb6033ae4ecc1e2e3610273fce71a317d7
diagram-make-it-plain-line = Ligne simple
# en: 3a4758c3cc8dac2d76026d0733816741f9b21d43
diagram-make-it-arrow = Flèche
# en: a07496767ed7e5caf20bb803434a1aa088aaa97b
diagram-what-connection-says = Libellé de la liaison
# en: 7d531617dd394cef59d3cf58fc32b3bc458f6744
diagram-who = Qui
# en: b48a4ad455ccc1431a4d3304864d95fb5de61df2
diagram-connection = une liaison
# en: ad87109bfff0765f4dd8cf4943b04d16a4070fea
diagram-empty = vide
# The templates
# en: 8b0bc4ee7e0e6e592c5e8812fef8883b9cbc66de
diagram-empty-kind-to-start-from = { $kind } vide, pour commencer.
# en: cc9cfe196eaec8bbe041a0f648039cf31df71bc7
diagram-browser-api-database-cache-and = Un navigateur, une API, une base de données, un cache et un worker, et la façon dont ils se parlent.
# en: 87796704431b42da8083f869f5ed707dae8cf8fe
diagram-building-project = Un projet de construction
# en: 5accd00ffa799aafee66a6e2e7a77c3e89abdd38
diagram-launch-and-everything-that-branches = Un lancement et tout ce qui en découle : produit, marketing, support.
# en: 9261260de34a3ec89f2846b1c6a53b8adc25bb35
diagram-package-through-store-warehouse-and = Un colis à travers une boutique, un entrepôt et un transporteur, avec une décision.
# en: 0ef1081dd660cc404f38216048590ca0999c05d2
diagram-small-company = Une petite entreprise
# en: 6dea73ecffb81e3db543a664a3ba6e602d58683b
diagram-wedding-dinner = Un dîner de mariage
# en: 1086ae322f0484af87b4a35b9537b35ad53ec68b
diagram-year-of-dates-from-plans = Une année de dates, de l’approbation des plans à l’ouverture des portes.
# en: c75834baf2bd8482dbb5a822f4466908244e65fa
diagram-cats-and-dogs = Chats et chiens
# en: 9e4600a93df1d0ffd290278244beed2111ac5cff
diagram-computing-briefly = L’informatique, en bref
# en: 4944a571da52f0920a54f002e637dfc6e179603f
diagram-fast-cheap-good = Rapide, pas cher, bon
# en: 77373004b00a68bf2cad476daa1ef0af2a7e26f0
diagram-four-tables-and-who-sits = Quatre tables et qui est assis autour de chacune.
# en: 1db47899ccb6eda1f1c46cee3c73acb1394c00ca
diagram-from-lovelace-to-now-spaced = De Lovelace à aujourd’hui, à l’échelle des années, avec les époques en bas.
# en: c973a2e43350a1c09697af1bd39a17f3cfba2c36
diagram-from-order-to-doorstep = De la commande à la livraison
# en: 91519d37fd9fe6f0c40b0429e0ed9f8eb8206006
diagram-from-job-description-to-yes = De la fiche de poste à un oui, couloir par couloir.
# en: bfd1a142e965498fd2dbaa45ca87c1cbdc9071c9
diagram-grandparents-their-children-and-grandchildren = Grands-parents, leurs enfants et petits-enfants, avec les années.
# en: 347a51bd3c26ccac83baeca51966f318d5bb06c4
diagram-hiring-someone = Recruter quelqu’un
# en: f30d75896062b87258051feec53d9f7c05059037
diagram-how-app-hangs-together = Comment une appli s’articule
# en: 70a97689961708e74a02157e6675bbcab893b7a4
diagram-seven-people-who-reports-to = Sept personnes, qui rend compte à qui, et un trait en pointillés.
# en: 45ccf051d72194e5207999d9eeabaf9311e07ec2
diagram-garden-this-year = Le jardin cette année
# en: 3fa0b6c790e0b44a046fe73aa9cf77f99106074d
diagram-three-generations = Trois générations
# en: 206f4033c4733b2b04a85ee0de9d35b1a5acc692
diagram-three-sets-and-every-overlap = Trois ensembles et chaque recoupement, avec ce qui va où.
# en: 762ecdafab9b2868da1121459828ec245b03ac5e
diagram-two-sets-and-what-they = Deux ensembles et ce qu’ils partagent.
# en: f02e532d172e25cb200306e2edda8e4331418dcd
diagram-what-to-grow-and-jobs = Quoi cultiver et les travaux à faire, en carte mentale.
# en: a6847567865dbe1e5266bbcd7f1f4e0049ee9eb1
diagram-biology-final-in-december-topic = Un examen final de biologie en décembre, chapitre par chapitre, et comment faire les révisions.
# en: e32c422ee266430ea9dd0cd2cc78750a1342302a
diagram-classroom = Une salle de classe
# en: e491ee6c30111d9c51d83d4a19aba47a3c39c769
diagram-family-with-godmother = Une famille avec une marraine
# en: c164cf0f878062c2b43b69bf4c1de2c3d6a1f94d
diagram-principal-her-assistant-principals-classroom = Une directrice, ses adjoints, les enseignants et le responsable du site.
# en: f25d2f240d3a52d5361d9b6dd4d8561290566159
diagram-move-to-lisbon-by-march = Un déménagement à Lisbonne d’ici mars : papiers, un appartement, travail et vie, et ce qui doit passer en premier.
# en: d2586903dd907f55b8076edbe00b87f4e45ab92f
diagram-elementary-school = Une école primaire
# en: 3eff234615aa3d538d44f11142e266d62b44ef43
diagram-restaurant-kitchen = Une cuisine de restaurant
# en: 3fecd5a70de57bb7748a775d7d4c6072bace1e50
diagram-router-and-everything-on-it = Un routeur et tout ce qui s’y connecte : ordinateur, téléphone, imprimante, télévision et sonnette.
# en: 949c596fb3177561b6f2515cbc92b6b68a4292c2
diagram-team-by-its-skills-design = Une équipe par ses compétences : design, écriture et code, et qui en fait plus d’une.
# en: eeb20483d989d9deef42a5ae150f171af0bc6201
diagram-expense-report = Une note de frais
# same
# en: ded9774849cab88a3dd08936595ffe270dd397a2
diagram-apollo-11 = Apollo 11
# en: b5723994f111884ca2f9a82ecb525fb6992e44c8
diagram-board-game-night = Soirée jeux de société
# en: d69e423520fc900afc06f3d31ab286694fb7d67b
diagram-class-4b-at-four-tables = La classe 4B à quatre tables par couleur, et le coin lecture.
# en: d8d0862686b742040e32f8f3235084ad61fcef28
diagram-eight-days-in-july-1969 = Huit jours en juillet 1969, jour par jour, du lancement à l’amerrissage.
# en: ce31ba59543ea424a6019bc67976ace141d62d09
diagram-four-games-table-each-and = Quatre jeux, une table chacun, et qui joue à quoi.
# en: 9d35a9836a6bb4c6180f6c2880c8c19c22ed4ea0
diagram-from-photo-of-receipt-to = De la photo du reçu à la fiche de paie, en passant par un responsable et la comptabilité.
# en: 1f1489585228c4bf2d9599bdff9fef70f59b4a60
diagram-moving-abroad = Partir vivre à l’étranger
# en: a04755781fd967ec44d2f47f1ebf6ff83b2fe909
diagram-patrick-and-maria-their-six = Patrick et Maria, leurs six enfants avec les années qu’ils ont vécues, et la tante qui les a élevés.
# en: 56aa5ec3b6a5e62a57ce1e1223c5f1f8148a7e02
diagram-studying-for-exam = Réviser pour un examen
# en: d7cda8e6bd3d07fe1968c61d6b068203911ae45c
diagram-sea-clouds-mountains-rivers-groundwater = La mer, les nuages, les montagnes, les rivières, la nappe phréatique et les plantes, et comment l’eau circule entre eux.
# en: a1da7a04adf4a0189219b39bddb2518c44ba382f
diagram-brontes = Les Brontë
# en: 0c2311a818005e4508a11aa6a888f61a45bd9a3b
diagram-brigade-under-head-chef-front = La brigade sous le chef, la salle à côté.
# en: 0c62114de8628cfe00011bba9cc35f003279ac83
diagram-house-network = Le réseau de la maison
# en: 1fcf7cc436a073faa316df56cf1a4d3ec2b87d6e
diagram-water-cycle = Le cycle de l’eau
# en: cdb628c70ae8584f4098828ec8a65f19d44697b8
diagram-three-generations-of-morenos-and = Trois générations des Moreno, et un trait en pointillés vers un filleul.
# en: 0e60bdf5cc3dbaa6c2018bd31c760c1e46e79ab1
diagram-who-can-do-what = Qui peut faire quoi
# en: b27a04f87f9d4657107a8dbd89d32eb1dedb41b7
diagram-tap-empty-space-for-branch = Touchez un espace vide pour ajouter une branche. Touchez une idée pour la modifier, Entrée pour la suivante. Glissez-en une sur une autre pour l’imbriquer. Relier en lie deux à travers la carte.
# en: fd23500d007e121f9530bb8b530f367ed9e00825
diagram-place-cards = Cartons de table
# en: dd9ef7db14a8bdb18f7a266d6e91711443e71a29
diagram-print-place-cards = Imprimer les cartons de table
# en: 030e26916d4c1d1ca0c41b3b447dde54ed891dbd
diagram-print-place-cards-card-guest = Imprimer les cartons de table : un carton par invité, huit par feuille Letter, à découper
# en: face83ee3014bdc8f98203cc94e2e89222452e90
diagram-guest = Invité
# en: 5734dbf560e03e0dea1a1bd85af5088238d5d0e4
diagram-new-idea = Nouvelle idée
# en: 32c6bde8aa4d539c3b773b1f4cf66e15aa427faa
diagram-tap-empty-space-for-person = Touchez un espace vide pour ajouter une personne. Touchez-en une pour la modifier, Maj+Entrée pour son rôle, Entrée pour la suivante. Glissez-en une sur une autre pour la placer dessous.
# en: 5f7463cc9e2e8a2e25990127091710a286d9765a
diagram-tap-empty-space-for-event = Touchez un espace vide pour ajouter un événement. Tapez la date, Maj+Entrée, puis ce qui s’est passé. Les dates sont espacées à l’échelle, et une période s’affiche comme une bande.
# en: b6395077670d276b6a207a6eadb6f5a17c1fa854
diagram-lanes-name = Le nom du couloir
# en: 769bb19e615b7f8e2809e5882e2d05a18f57a531
diagram-when = Quand
# en: b23ea75ecf303b9756682c84abecebc7a010f2b1
diagram-tap-person-to-type-on = Touchez une personne pour la modifier. Ajoutez + et un nom pour un conjoint, Maj+Entrée pour les années, Entrée pour la suivante. Glissez-en une sur une autre pour la placer dessous. Relier trace une ligne pointillée.
# en: 14e56ce6d5f3d8d56d2ce979bf2eb20aaa9dd93d
diagram-tap-empty-space-for-table = Touchez un espace vide pour ajouter une table. Touchez une table ou une personne pour la modifier. Une virgule commence l’invité suivant. Glissez une personne vers une autre table.
# en: 7049f105f3a76be9cb8c6d7b74eb3edf60d9a7da
diagram-tap-inside-circles-to-add = Touchez l’intérieur d’un cercle pour ajouter un élément. Une virgule commence le suivant. Touchez le nom d’un ensemble pour le renommer. Glissez un élément d’un cercle à l’autre.

## the Trip Planner

# en: fdd91fbac0e5654a70026a229cc8a5d869157b24
trip-trip = voyage
# A stop is a place on the route; { $n } is its number, { $time } a drive such as "1 hr 38 min". 'Trip Planner' and 'Plan' are above.
# en: 46644fef83a4f92870b2bda5079d97dae8b05b1f
trip-route-on-map-stops-in = Un itinéraire sur une carte : des arrêts dans l’ordre, chacun avec une note, et la distance entre eux.
# en: 199cd6e4be673dbec0dfaaa645071e949f5480cc
trip-gpx-route = Itinéraire GPX
# same
# en: 97eeda258d4d0c87a81a7741038e625eda23a2a6
trip-geojson = GeoJSON
# The bar and the map
# en: 63746c80a9900aa0b9df832d6fe50b7318a88aab
trip-a-place-by-name = Un lieu par son nom…
# en: c86d6e7640906afe6a57236c004f0b1af53b6ee8
trip-stop-at-middle-of-map = Ajouter un arrêt au centre
# en: a52fccf0e1e5beca9d5885f1638d5e9a6a2684f9
trip-measure-in = Mesurer en
# en: 2458f1444290ced8aefad04d5c947b17bf9a81fb
trip-hours-of-driving = Heures de route
# same
# en: 5fa6c4032be31076212eb57f2fe6ba44d445d501
trip-miles = Miles
# en: 87bafdbb82c61625882d74515ef2c7e566177ea5
trip-kilometers = Kilomètres
# en: 8e49f86b47ba8e4ac259af7b5428623e7332489c
trip-join-stops-in-order = Relier les arrêts dans l’ordre
# en: 7bdcf970899e9519b75f2dc24d1909f670b283cb
trip-show-whole-route = Voir tout l’itinéraire
# en: fa157c9ab413b3c415d7ada7457694a35c7869a1
trip-where-i-am = Où je suis
# en: ab478f3efc840eebab919dff1b9512286f70c10c
trip-map = Carte
# en: 4fa4643900d7a129558f6c34b681a8d419a9ef9d
trip-map-tap-to-add-stop = Carte : touchez pour ajouter un arrêt
# en: a481372d94c5d404a0bd0a597cda747c83e952a4
trip-map-comes-from-openfreemap = Les tuiles de la carte sont chargées depuis OpenFreeMap tant que la carte est ouverte.
# en: dd1ac7c6150bf40973c618ac841d01f2281dea20
trip-your-location-is-asked-for = Votre position sert uniquement à centrer la carte et n’est jamais conservée.
# en: 6c4827a34debc3c12e8a905f5e8025f0d22802cb
trip-n-stops = { $n ->
        [one] { $n } arrêt
        [many] { $n } d’arrêts
       *[other] { $n } arrêts
    }
# en: 44896c642dce2a144eb35fdb61cedb762cc44ca1
trip-stop-n = Arrêt { $n }
# A stop's number is its handle; the bar under stops chosen whole.
# en: 372c19ab2c53f7582cdbe3823523a8760d0f2807
trip-stop-n-tap-chooses-it = Arrêt { $n } : touchez pour sélectionner, glissez pour déplacer
# en: 56f844200d56e1fc382c81f28972a39aab61e019
trip-chosen-stops = Arrêts sélectionnés
# en: 0e648419ea806b0cc4db81617f95870a094f3639
trip-stops = Arrêts
# en: a9d55cf1a8a7b85ab9e293fc1e40a440986b0725
trip-show-on-map = Voir sur la carte
# en: bdea0edfea6bebf4baf952432856faf7b3f43890
trip-name-of-stop-n = Nom de l’arrêt { $n }
# en: 4dad38541848da253722328a5517dffdda35b4ab
trip-note-for-stop-n = Note de l’arrêt { $n }
# en: 0a8abf5522e2f20b1f976982533aabd909645324
trip-about-time-by-car = environ { $time } en voiture
# en: 7f85e32db6c77473c8b172d1ad1dab75462705a3
trip-tap-map-to-add-first = Touchez la carte pour ajouter le premier arrêt, ou Insérez un lieu par son nom.
# en: 472fd6a8979384a06de401f16cafb9cfdd9a824c
trip-insert-place-by-name = Insérez un lieu par son nom.
# Finding a place by name
# en: b75a19207f834200f4801a2db37886567baf25bc
trip-place-by-name = Un lieu par son nom
# en: 7d7388a1d59910888c95c66fed24ad82cb5edbf2
trip-find-place = Trouver un lieu
# en: 57d3470391ec96a8442196a4ff85cf39e4f65e98
trip-town-address-museum = Une ville, une adresse, un musée
# en: bce06414177f72ab70e6387b6af9f8ceef0d6049
trip-search = Chercher
# en: 1a6a5ba8c23ddb672874a2996abaee1fe933abcd
trip-searching = Recherche…
# en: 07a4d61733e108a8ffa6e5753e09227b6a1a0f80
trip-searching-sends-words-you-type = La recherche n’envoie que ce que vous tapez à Nominatim, d’OpenStreetMap.
# en: 2b36ec5f26fb5c35fccb5edd05776349d238b677
trip-places-found = Lieux trouvés
# en: 6c70807e19d1f88aae7d66770719debbaf4ae89b
trip-nothing-found = Aucun résultat.
# The templates
# en: ce482808305f25f4c7f63905061b0c411444f12c
trip-week-in-portugal = Une semaine au Portugal
# en: 3a4002be5f16560bb462d3f37d8b2caac8a65603
trip-lisbon-to-porto-by-car = De Lisbonne à Porto en voiture, en kilomètres, un conseil à chaque arrêt.
# en: 72fa00e64f1816bfe62cd5e5ebae7ddd8bbc1d59
trip-down-pacific-coast = Le long de la côte Pacifique
# en: 6d871c8c9ed845cfaaafff0c18e335ce6da9ba42
trip-san-francisco-to-los-angeles = De San Francisco à Los Angeles par la Highway 1, en miles.
# en: 8396776ccda695ac7d6e5f12a1eaa4dd3edecfac
trip-scottish-highlands = Les Highlands écossais
# en: 7a3f06a64060636652afe5912e0a00016bc3d17f
trip-loop-from-edinburgh-each-leg = Une boucle depuis Édimbourg, chaque trajet en heures de route.
# en: 9660e47a7aad398fbc88947cd22e8628b2a92115
trip-rome-places-to-see = Rome, les lieux à voir
# en: f01c658cc1c5b1dbfba8045b885174d2f5a3d154
trip-places-as-dots-not-route = Des lieux en points, pas un itinéraire : quoi voir et quand y aller.
# en: e50e4931f42687faef4a226f93981bb38a937ce9
trip-weekend-in-copenhagen = Un week-end à Copenhague
# en: 402e0be1180f76470536e904cec4f7242211bb15
trip-friday-night-to-sundays-train = De vendredi soir au train de dimanche, à pied, en kilomètres.
# en: a5594e90d42f49b6ce9e2842193b64f380d1a10c
trip-icelands-ring-road = La route circulaire d’Islande
# en: b237aa87bc63dccebef93e19a8ef785d96ba69ce
trip-ten-days-around-island-by = Dix jours autour de l’île en voiture, chaque trajet en heures de route.
# en: 89059cee91b704cf1c0e42de4225df2968a207e7
trip-dublin-food-crawl = Une balade gourmande à Dublin
# en: b934fa6dfc063b38e47ce12ed4622e1cc0d55b75
trip-seven-places-to-eat-in = Sept adresses gourmandes en un après-midi, d’ouest en est, une courte marche entre chacune.
# en: 2149c2c628bda1d9ea8522144f7ca59ce2a6bcc8
trip-yosemites-mist-trail-loop = La boucle du Mist Trail à Yosemite
# en: 056b43a68d915001b02640fbb4ec910045a406ad
trip-two-waterfalls-on-day-hike = Deux chutes d’eau en randonnée d’une journée depuis Happy Isles, aller-retour, en miles.
# en: b1365d430388f423cf7142e4a78c7470fed8a5fc
trip-loire-by-bike = La Loire à vélo
# en: e0fc4a0bf8e42cf48f5f6825bc3b8420df625254
trip-orleans-to-saumur-in-six = D’Orléans à Saumur en six jours, de château en château, en kilomètres.
# en: e68d998a80765bfa302dd2b477f31c97db0d51d2
trip-college-tour = Une tournée des universités
# en: 02b9d4cf509b27e9011826d208a7831782bb08a6
trip-six-campuses-in-new-england = Six campus de Nouvelle-Angleterre en une semaine, une visite réservée dans chacun.
# en: 651b0f889a962febf3a80370511cbc08abac73da
trip-japan-by-rail = Le Japon en train
# en: f687060ca9b759a7ed4bca61f7a2bf96764f2f8e
trip-tokyo-to-miyajima-in-cherry = De Tokyo à Miyajima sous les cerisiers en fleurs, en train à grande vitesse.
# en: afea6c128d27238aad4e11871dfff6f692334301
trip-last-100-km-of-camino = Les 100 derniers km du Camino
# en: 33d01f381424bbc8bbd1b6a9487b3a53c38d07e9
trip-sarria-to-santiago-on-foot = De Sarria à Saint-Jacques à pied, une étape par jour.
# en: b15aca8406aa957e0b92331f3c94b96775672e6b
trip-new-york-in-movies = New York au cinéma
# en: cdd506e6983757bd11c62cbbe6a0acbbd4002303
trip-seven-film-and-tv-locations = Sept lieux de tournage de films et de séries, du nord au sud de la ville, en une journée.
# en: 2cf068b9c859d837fbc257f1dc20a64d0d96b2b0
trip-wedding-on-lake-como = Un mariage au lac de Côme
# en: a3dec1f6e3f5856eb26a70a9c329744d499a1afc
trip-for-guests-where-wedding-is = Pour les invités : où a lieu le mariage, où dormir, comment s’y rendre.
# en: 0fbbb28a6e64acfee9300ecf05016dcf149a5a19
trip-presenting-trip = Présentation du voyage
# en: 24848d1e92a4b831f8fdae547c2fbfdc0d1e441b
trip-presenting-next-stop = Arrêt suivant (en présentation)
# en: a802f6e93c981ee6dd02df366f0141ca3aa085e0
trip-presenting-stop-before = Arrêt précédent (en présentation)
# en: 3b14d20764a1fdef5ee74f4defab4ff20b0e7cce
trip-put-stops-on-calendar-day = Mettre les arrêts sur un calendrier, un jour chacun
# en: 16fa5ad4958332a6bbb1eae6d1a8c6ee6f2c7752
trip-first-last = Premier ou dernier
# en: 0aa341109cff3c75e204930fdeac94f52278bb67
trip-next-stop = Arrêt suivant
# en: 35bc0362a4899961a0e878990611c13021c1e549
trip-stop-before = Arrêt précédent

## shared: the Word Processor's looks, the header's Home, a money column's currency

# en: 958de540438a0fa530d47d2c072d0d9c22cd2af5
looks-typewriter = Machine à écrire
# same
# en: a5c78a86fab1c02cd981c23b8bad5dad3e7438e3
looks-serif = Serif
# en: 70f8bb9a8a5393ef080507a89e4b98d139000d65
common-home = Accueil
# en: e070de224434a2acd352b35cec46f34f9e08e1b2
looks-currency = Devise

## the Calculator app

# en: a0015ec89d8034b2ca4a8f0219350514e19294a0
calc-calculation = calcul
# The tape is the list of lines worked out, as on a printing calculator. 'Calculator' and 'Numbers' are above.
# en: ab4ea6f8fe06812a128297560bee7aff1be0c040
calc-calculator-that-shows-its-work = Une calculatrice qui montre ses calculs : noms, unités et conversions, et graphiques de y = f(x).
# en: f146f8e93fc9312f6b8003b048cd24d1574469af
calc-tape-text = Ruban en texte
# The bar
# en: 9a7405ebcedde5be8d095a986ea8794e19ee84e2
calc-graph = Graphique
# en: a3310f1f9bbb12cd753850392faec8453a10c709
calc-clear-tape = Effacer le ruban
# en: 14a09e767bb648a339ba82fb609c02f3d9aa4228
calc-clear-graph = Effacer le graphique
# Insert: functions, and what the second engine reads
# en: 2b961dea1dc0c60ddf9a2c8e9d090f6f7d082483
calc-functions = Fonctions
# en: ca0c5d6d0a40f5f2e6f47ee8fc8b934a3eece03f
calc-sine = Sinus
# en: c1951ad44359d27f765c0f1c7bfea678577a3fb1
calc-cosine = Cosinus
# en: 7ef1446b5f4ac08a82f28ef66bf019af3ed9c3c5
calc-tangent = Tangente
# en: f90781f1beba7ea766ef6fddf4672221c99da01f
calc-natural-log = Log naturel
# en: c4607860d3bb073b2fe96de25c2566b33f6e5610
calc-log-base-ten = Log base dix
# en: 47a3278f023594b94c900b5d792366be2e8b3d39
calc-square-root = Racine carrée
# en: 35e4a1a9ace5e53c1521b13130f3b1fce0bb312b
calc-absolute-value = Valeur absolue
# en: 8e4e872b30d442c4d7f1edf2cabdff971300b607
calc-factorial = Factorielle
# en: c584662e0778e58334ec2e9f7fc7f58a98d4dca8
calc-e-number = e, le nombre
# en: f3afae23c74a7d1a42a52c0c47bfeb1191b6b6e9
calc-x-for-graph = x, pour un graphique
# en: 1cfd7bfc7d3d79d7ea28a91bdc6e032559103831
calc-units-and-algebra = Unités et algèbre
# en: de1e4faaa9758db564ba458c3956824881efcd9c
calc-convert-to = Convertir en
# en: 95562b515314072f0bc7658aa71f2ef77371d893
calc-derivative = Dérivée
# en: 965a00d9ba9665ad57ca3edefdcca07a61d3ca95
calc-simplify = Simplifier
# The tape, the line being typed, the keys; { $answer } is a result such as 42 or 7.62 cm
# en: c51c55b719457118a73f5732f4dd4772aaba2e20
calc-tape = Ruban
# en: 1acb1c0448ace57b632dc2d56121f45a18e646be
calc-line-n = Ligne { $n }
# en: 43885eadc7bc789d89e6e81db680818d2dd1b223
calc-put-answer-in-line = Insérer { $answer }
# en: a9c16dd084ce3781568419133b0fa0c0f57aa727
calc-no-answer = Pas de réponse
# en: cf23123f857abeda1d28fc9b85cc7eba8d20f3b1
calc-take-away-line-n = Supprimer la ligne { $n }
# en: fc9ce14b28c6f2c3b72caf056ca604b2b96f7d2b
calc-sum = Somme
# en: fdb6ecce95257d64ccde93310bf9a9adc8ad249e
calc-type-or-tap = Tapez ou touchez
# same
# en: e1745e3e21e84b24c379af6f45a18e1a21e56577
calc-y = y =
# same
# en: 97e60be18b1afcca3cde2fc6df4343208cefb0a1
calc-y-equals-ellipsis = y = …
# en: 71f2d6a97665cb72b50a6384a06af3e014b96db5
calc-at-x-1-answer = pour x = 1 : { $answer }
# en: e5651c683f14c95aa972cfdbc300d9fecfe02019
calc-keys = Touches
# en: 88d130a66de8e5db01660642d9f23e1f0eef97dd
calc-backspace = Retour arrière
# en: d1149c36a0edcfbeae98bf270da3f543b6c6a866
calc-clear-line = Effacer la ligne
# en: 097a41c8c7e58b9b655d7b3e31a3673466595450
calc-answer-before = Résultat précédent
# en: 2ee9e26d39d7113bd8fea80639d6257ab1bdf8cc
calc-type-sum-or-3-inch = Tapez un calcul, ou 3 inch to cm, puis appuyez sur Entrée. a = 12 enregistre un résultat sous un nom.
# en: 0bef86b24e006bd994db1509b268156522c7dc2c
calc-type-curve-in-x-such = Tapez une courbe en x, comme x^2 ou sin(x), et appuyez sur Entrée pour la tracer.
# The templates
# en: bcb584ffecef3a17141a771a3ceedbbe6d474ca1
calc-splitting-bill = Partager l’addition
# en: 0a45fc60c975ea141733f982179ead17af8767b6
calc-food-drinks-and-18-tip = Plats, boissons et 18 % de pourboire, partagés à six, chaque étape gardée sous un nom.
# en: 2c9e678b58314997051ff2c13d56c92ea6bce7d7
calc-shopping-total = Un total de courses
# en: d8719443b912bfaadd4f5d8fb2f1fc095f58ff52
calc-tape-of-market-apples-and = Un ruban du marché : pommes et fromage au poids, le total, et la monnaie sur 60 $.
# en: 56d12d641f4f4177e63e120c8bd10a8e7348357f
calc-tax-on-price = Taxe sur un prix
# en: 8a7d0a08d1e03c2974f84aa039e7871c5b232245
calc-new-york-city-sales-tax = La taxe de vente de la ville de New York ajoutée à un prix, et retirée d’un ticket de caisse.
# en: 80296be8eee3142eb634c0045f82e15b5e5373aa
calc-percentage-change = Variation en pourcentage
# en: 93650e756cc879e41310d678219f483e5ce2cfd1
calc-rent-up-from-1-450 = Le loyer passe de 1 450 $ à 1 595 $ : de combien, de quel pourcentage, et face à une augmentation.
# en: 9ff9fc7e0344944578d50820e0326f7bf34f1c8e
calc-kitchen-conversions = Conversions de cuisine
# en: c7ccdb52f144fcec56adb8ecb5264f35d03600c0
calc-cups-ovens-spoons-and-weights = Tasses, températures de four, cuillères et poids, d’une mesure à l’autre.
# en: 267b3d4696b05cc65039fcf4afb8cd9548ed5a29
calc-scaling-recipe = Adapter une recette
# en: a0e9dcbc29ed1364a4891c3671dd43675af64d11
calc-banana-bread-for-eight-made = Un gâteau à la banane pour huit adapté pour douze : chaque quantité multipliée par un et demi.
# en: 8639704eb84800c829b41e6fcd833d686dcb41f6
calc-unit-conversions = Conversions d’unités
# en: 2aef2060ccb74d32576f5b1f936372bdd97252f3
calc-feet-to-centimeters-miles-to = Pieds en centimètres, miles en kilomètres, livres en kilogrammes, Fahrenheit en Celsius.
# en: 7b31203b4780df1cd410c84049ed4d031dacc8e3
calc-currency-at-rate-you-type = Devise à un taux que vous saisissez
# en: 5f4e47693383fd619db1b39871b821a7fccf86df
calc-trip-priced-in-euros-and = Un voyage chiffré en euros et converti en dollars, avec les frais de carte en plus.
# en: 6645ae7e46c209b7ba6f5fb3b6aa707395a2c3d2
calc-fuel-for-trip = Carburant pour un voyage
# en: e2d3235c5cfd9ceffb4e54f0635e4f3841b0c0e1
calc-boston-to-montreal-and-back = Boston–Montréal aller-retour : miles, miles par gallon, le prix, partagé en quatre.
# en: bb294d581aa3512dfdaf06cb5705338f026425ff
calc-paint-for-room = Peinture pour une pièce
# en: 8899142eaeb03e3a2cfc17f5e68f1977478e2ce5
calc-walls-less-door-and-windows = Les murs moins la porte et les fenêtres, deux couches, en pots d’un gallon.
# en: fa9aac4028931969e4e43d5926f21c1c02b03737
calc-time-zones = Fuseaux horaires
# en: daa6b831387e404e18a932466e1b26486e942c1b
calc-one-call-at-9-in = Un appel à 9 h à New York, et l’heure qu’il est à Londres, Berlin, Mumbai, Tokyo et Sydney.
# en: 4126383a0888802d508caf9f1e9a973554c6eb7e
calc-running-pace = Allure de course
# en: 73e59d9404aa7a32f2e7e9ae9ff609c2a74d14cb
calc-10k-in-52-30-minutes = Un 10 km en 52:30 : minutes par kilomètre et par mile, et le semi-marathon et le marathon à cette allure.
# en: d1411ae3cdd27fda5ea57577c408be223f586cf0
calc-body-mass-index = Indice de masse corporelle
# en: cf37a053ab6daf8527ff908a4479b6fb38654155
calc-weight-over-height-squared-in = Le poids sur la taille au carré, en kilogrammes et mètres ou en livres et pouces.
# en: 18c8c5aa1c31cb796ef6aa8086b794bc59e4d454
calc-dose-by-weight = Dose selon le poids
# en: a2cdd7739e2ff2b4f1ee78074c5c7981d1b877f9
calc-milligrams-kilogram-turned-into-milliliters = Des milligrammes par kilogramme, convertis en millilitres de sirop ; faites vérifier chaque dose par un pharmacien.
# en: 4699da98e2d343e04aa2465082aedd4d5053aa11
calc-electricity-for-appliance = Électricité d’un appareil
# en: d1b1126c73c13b523ce30bd2f563ad1a7b1c0210
calc-watts-hours-day-and-price = Des watts, des heures par jour et le prix du kilowattheure : ce qu’un radiateur coûte par mois.
# en: 96aeea666f6bd696d83ef3dee80fff1fcc3ff896
calc-loan-payment = Mensualité d’un prêt
# en: 9c2f158098b8fc30f79ae0d1db9391a68d8aea9a
calc-24-000-at-6-9 = 24 000 $ à 6,9 % sur soixante mois : la mensualité et les intérêts au total.
# en: 3c48bd272b7ad823e277ca649218ae107832bca4
calc-compound-interest = Intérêts composés
# en: ce79ef1a5e051c360028ef440ccc8258554abe0a
calc-5-000-and-200-month = 5 000 $ et 200 $ par mois à 5 % pendant dix ans, face à ce qui a été versé.
# en: 813161b07c2ed5cab82b09f8c31b3810800bcd26
calc-break-even = Seuil de rentabilité
# en: bee9b48a097d165fe0d11f7c3a7175019c158c5e
calc-costs-against-sales-for-coffee = Coûts face aux recettes d’un triporteur à café : là où les lignes se croisent, c’est le nombre de tasses par jour qu’il lui faut.
# en: a9047269b4f64dbbb2df8503315406b2b33fc4e9
calc-curve-and-its-slope = Une courbe et sa pente
# en: b5f43817a99082555a1fc4891fd2eb5bfaba6e10
calc-x3-3x-its-derivative-and = x³ − 3x, sa dérivée, et la tangente horizontale au fond de la cuvette.
# en: d4802215f2c0025bd9e3f3fe025230ceda4e830b
calc-waves-adding-up = Des ondes qui s’additionnent
# en: 9e46b2d75638fb2ebe905ad0c4be8059be6487cc
calc-sine-waves-summed-on-their = Des ondes sinusoïdales additionnées, en route vers une onde carrée.
# The grip on a line of the tape; the bar under lines chosen whole.
# en: fd71cff4626f555a0e69c5b6801a591cabd1d173
calc-choose-line-n-drag-it = Sélectionner la ligne { $n }, glisser pour déplacer
# en: dab2e3d9cf8c3bfccd20fa34fac6fc738ce9aba7
calc-chosen-lines = Lignes sélectionnées

## two links compared (kit/ui/compare.ts)

# en: 8aa57de6dce6ee1c35c6aba7426503281876b258
compare-changes = Modifications
# en: 8d105cf44d3926289e65c1c83d8e37cb23fd049e
compare-compare = Comparer
# en: 24512a18bc6d2c27213ad28b26ce9271d94175af
compare-no-difference = Aucune différence
# en: 8f0fb2d2ece91d9de4ed64f23a12b475c3e18970
compare-not-link-to-tiny-little = Ce n’est pas un lien vers un document Tout Petit Bureau
# en: e82be1221a13b593fd3fd58ffe24f3c3ba58f783
compare-paste-second-link-to-see = Collez un second lien pour voir ce qui a changé.
# en: 442aef6fc360061295985657c4489b3c4d360cc3
compare-paste-link-to-document-as = Collez le lien du document tel qu’il est maintenant
# en: 7fb07fcb91ba19442009f16f24be4ef85b3eca16
compare-paste-link-to-document-as-it-was = Collez le lien du document tel qu’il était
# en: 0ae84aa126111ee639f685e9ed05c6895e632a90
compare-put-in = Ajouté :
# en: 210dd62a81e43d19e22018878ba665485e0526cb
compare-swap = Échanger
# en: c331654dfaed937af3dc0e72f31b21fdfb1aa325
compare-taken-out = Retiré :
# en: aec0a618ef67ca171ab77615fc7cab57405fea3f
compare-first-link = Le premier lien
# en: 123bc4a6d63cd1415119c84ed21412a29ef9fbcc
compare-second-link = Le second lien
# en: 010030de6a30e85dd769e07201d8373ebff655c8
compare-two-links-to-documents-side = Deux liens vers des documents, côte à côte : ce que le second a changé est marqué. Rien ne quitte cette page.
# en: 2053662dff5d94e9ea30321321ce6cd0df8f0027
compare-different-apps = applis différentes
# en: f4e4b3a1d739ce43635eb9d75d97403c420c0642
compare-n-blocks-taken-out = { $n ->
        [one] { $n } bloc retiré
        [many] { $n } de blocs retirés
       *[other] { $n } blocs retirés
    }
# en: 0041ce2f8795b8fbc93244ba17b668d115906ef3
compare-n-put-in = { $n ->
        [one] { $n } ajout
        [many] { $n } d’ajouts
       *[other] { $n } ajouts
    }

## files and zips dropped on the page (kit/file/open.ts)

# en: c99db7abba3f7227854d93a163ad3494de4e1571
open-opened-name = { $name } ouvert
# en: f917dee4211bd4af58db8efec79e354e1ffb4912
open-that-file-is-not-words = Tout Petit Bureau ne peut pas lire ce fichier.
# en: 1d08903947cc83b648f8ad96b1e23466a2dbed11
open-that-file-is-too-large = Ce fichier est trop volumineux.
# en: 8f432852569edbf7610713a6554e7a61396327d5
open-keep-them-on-this-device = Les enregistrer sur cet appareil
# en: c4fe6d8b035f6108e8a7e0037667dacf3d6cca25
open-nothing-is-saved-on-this = Rien n’est enregistré sur cet appareil. Enregistrez-les ici, ou ouvrez-en un.
# en: 0826daee1d616f7de3a2b205eb2360fcaccc77ef
open-first = Ouvrir le premier
# en: 59d36bf6c42ab3ae1481fe62abbc67ffef7a8b22
open-saving-in-this-browser-n = Enregistrement dans ce navigateur : { $n ->
        [one] { $n } document conservé
        [many] { $n } de documents conservés
       *[other] { $n } documents conservés
    }
# en: 4fc6621d5b53d413dd1fd42cf7e7834ee3ecba5a
open-that-zip-holds-no-documents = Aucun document lisible trouvé dans ce zip.
# en: ed5d2e1ab481efa92392820d83922b25c236c730
open-n-documents-kept = { $n ->
        [one] { $n } document conservé
        [many] { $n } de documents conservés
       *[other] { $n } documents conservés
    }

## a document's QR code (kit/draw/qr-picture.ts)

# Restored around the document: search, Find in this document, the shortcuts and the apps' keys, Mod+S, the size of
# everything, Add to home screen, another version kept here, where the link fits, Open in another app, the QR code
# of this document, Insert narrowed by typing, Trip presenting, a seating chart's place cards
# en: 775db36d459744f2dc73dcb147ab032f4b6f4a09
qr-code-of-this-document = Un QR code de ce document

## the keys, the shortcuts and the size of everything (kit/core/keys.ts, kit/ui/zoom.ts)

# en: e5737972ceac5c184d5009e9ee1746c4b3292f26
keys-normal-size = Réinitialiser le zoom
# en: 4fc05f2763ba31e2d3be5f08e7d0bab5d5dcbf78
keys-everything-larger = Zoom avant
# en: a4ae4b24a1f5369c2bff61abdbc221170e4b27d8
keys-everything-smaller = Zoom arrière
# en: 67312061f24800b7dc75b07101329959c5c1af88
keys-keep-this-document-on-device = Enregistrer sur cet appareil
# en: 4d5e11a737e63d755f4127a0139f235f3794b6c6
keys-show-these-shortcuts = Afficher ces raccourcis
# en: da05037a43419e15395f52f0ed4dcb0c7f75c1f2
keys-this-page = Cette page

## Find in this document (kit/ui/find.ts)

# en: 475c848673a3f79fa778f01c2bd5a721d4c41707
find-not-found = Introuvable

## a menu narrowed by typing (kit/ui/menu.ts)

# en: a9c25fead588babdd6b90b343a47f716f722312e
menu-nothing-starts-q = Aucun résultat pour « { $q } »
# en: ddf17f8747a6b36489443d6b09c25b429a1ea675
menu-starting-q = Résultats pour « { $q } »


## who did what, listed for review beside a document several people write (kit/ui/review-panel.ts)

# en: 8aa57de6dce6ee1c35c6aba7426503281876b258
review-changes = Modifications
# en: e6e3bb8760dfc9ea888b1967a09130f9c89fce15
review-none = Aucune modification à examiner.
# en: 42e31dd677dc8b702293354c898041b64c77c442
review-put-in-for = « { $took } » remplacé par « { $put } »
# en: f328a19b27f5338a00f443da396faccd6d9030a1
review-put-in = « { $words } » ajouté
# en: a67a3c5917ce7d2467dc22ea5d88e34d7c253b5b
review-took-out = « { $words } » supprimé
# en: 0a327a9ace030c351cd61b21a1eff225ff12941c
review-put-back = « { $words } » rétabli
# en: 309250888492d1a0aaebb8f6920e9776a0c0dcaa
review-restyled = « { $words } » mis en forme
# en: be485cefbc9f51f3315136dd5bb07ea3fa8d04c0
review-put-in-line = Ligne ajoutée
# en: 1f1fe15e0ff5fad870fa70dfa7d7c39cb13b807c
review-took-out-line = Ligne supprimée
# en: 7f356b013fff2debeaa8414c985236bd05276b21
review-changed = Document modifié
# en: 92da3da547e5dd5677b18922b1611f08c61f4681
review-rejected-putting-back = Modification refusée, « { $words } » rétabli
# en: b10117b3632f96b6169864b190e3c106a212dc2a
review-rejected-taking-out = Modification refusée, « { $words } » retiré
# en: 30983f282a9a57909b378cd4134d143a067e0415
review-rejected-restyling = Modification de mise en forme refusée
# en: e235e19c7ec71b01d43fe842983f3a80c6212095
review-waiting = En attente de votre avis
# en: 6b94b0a9cbfbb2fc3ce5081c50246ab3016e4c73
review-yours = La vôtre, en attente des autres
# en: a90ec4fbb1f4f2050856da437722dada4ab986dc
review-reviewed = Vous l’avez examinée
# en: 61a0572c4893ef34311320d84c82df88bea83e11
review-accepted = Acceptée
# en: 27eeb7a291bfc566447d9cd928e98caf90f70ee6
review-rejected = Refusée
# en: 664b4269aeb67f403d95cde6c1d30eb3f135b08f
review-accepted-by = Acceptée par { $names }
# en: 9e374afbcb1f0734401d4464d24993a8a3245d54
review-rejected-by = Refusée par { $names }
# en: 41b8f5693f30107a055b7507a7095b5ca0aa8fd9
review-n-waiting = { $n ->
        [one] { $n } en attente
        [many] { $n } en attente
       *[other] { $n } en attente
    }
# en: bb54db510a92908a5a4df79fc1ad1eae8df50ec3
review-accept = Accepter
# en: 2b03b59293b6fc7101306f5d9ae1e96327bb419a
review-reject = Refuser
# en: 821d1f7909a5146fa98fd5228675c49e64c6e60b
review-accept-all = Tout accepter
# en: 35c291a4ab2f675bdb9437918790287fcfec88fa
review-reject-all = Tout refuser
# en: 76cc08ef327763a9a7b47697d90d71a69acbed05
review-accept-all-by = Accepter toutes les modifications de { $name }
# en: 56db173f938aff6b5e405bb416ba178d4d344159
review-reject-all-by = Refuser toutes les modifications de { $name }

## comments beside a document's words (kit/ui/comments.ts, kit/ui/comment-box.ts)

# en: fce06e20e5f7f74aacccab40b59b75a56c8f7305
comments-comments = Commentaires
# en: af65ae0e9f04990618e53d608489530582356c11
comments-new = Nouveau commentaire
# en: 207b24fc9b9276a4b2709de85e55eb8adbba3806
comments-none = Aucun commentaire pour l’instant.
# en: 4a88284dee66496310481a76d3d91ba0a1099aea
comments-select-words = Sélectionnez des mots et choisissez Commenter pour réagir.
# en: 570aad8456c6d9321e051c22879ae5833cf0cfde
comments-words-changed = Sur des mots modifiés depuis
# en: 64d379f0d0c939707ccfbb7245f744611def8c96
comments-whole-document = Sur tout le document
# en: d999aeb0545fa93c44c82d1abb928c06e3590523
comments-resolved = Résolu
# en: ac7f958cc028becfb4b2bec9c474bd2d5e8b6095
comments-resolve = Résoudre
# en: 61e05da2a47259dbae5eb58fad4b1af04dd69e07
comments-reopen = Rouvrir
# en: 6c2bb735a46a8ff307fe2e638d581295b2a49e09
comments-reply = Répondre
# en: 3a71e78cdb4d792bb688c8dbba093a0bda884647
comments-n-replies = { $n ->
        [one] { $n } réponse
        [many] { $n } de réponses
       *[other] { $n } réponses
    }
# en: 911d801f12b06712dee871fc5f647eacc04e430f
comments-by = Commentaires de { $name }
# en: 23b48bef02ad4d2437d3f19ab9df708fac256c00
comments-ask = Demander à { $name }
# en: 9dd346ebb60f70ca00c786e8697e934709bf0a73
comments-asks = Demande à { $name }
# en: 13ff50a2189f50a0c931f16e02b060b37ec0208e
comments-answering = { $name } est en train de répondre…
# en: b37554f695b15005fd23907b9488e0a8ad4bca5f
comments-people = Personnes
# en: 0f87ce5a3cbdf6796c6f152204e44b143201290f
comments-write = { $what }… @ pour mentionner des personnes

## a host's own pages: its table, its search, its header (kit/ui/table.ts, kit/ui/search-box.ts, kit/ui/header.ts)

# en: 4816c01fcfc82e618ba8d4f9f2d5cca84f36a4c1
table-filter-rows = Filtrer les lignes
# en: f648af13b3a158a514634b7a27501c621e4f9c87
table-add-row = Ajouter une ligne
# en: 45b553017087942f58e36f1963f58398aaa93cef
table-select-all-rows = Sélectionner toutes les lignes
# en: 9320afbefdcf309b4b763224769937b3936d517a
table-select-name = Sélectionner { $name }
# en: e892255d168b0ccc00b895b653a7ff8d9a7ab4f0
table-no-rows = Rien pour l’instant
# en: 7dc03a2b77e86b5ce3279f1239cf7eed2c3e31dd
table-no-rows-match = Aucune ligne ne correspond
# en: fc6c0582fa83a05374d53d05a9e4fbd9a76f7adc
table-sort-hint = Trier par cette colonne. Maj-clic pour trier aussi par elle.
# same
# en: c3cd636a585b20c40ac2df5ffb403e83cb2eef51
table-row-actions = Actions
# en: 0a35ecd2f44a46e9904bd46d91557748cc409ac8
table-actions-for-name = Actions pour { $name }
# en: ab5297fdaa47a693168d73de9b199b904eddba8d
table-no-records = Tapez pour chercher
# en: bce06414177f72ab70e6387b6af9f8ceef0d6049
search-label = Chercher
# en: 1a6a5ba8c23ddb672874a2996abaee1fe933abcd
search-searching = Recherche…
# en: 938206ae8c35210570eff0f625f7174736ab50d3
search-failed = La recherche n’a pas abouti. Réessayez.
# en: 445b04c118dbe3becf81b1490e4f09218cd85a09
search-n-found = { $n ->
        [one] { $n } résultat
        [many] { $n } de résultats
       *[other] { $n } résultats
    }
# en: 1c8d7da8241f46e35847a6ee94585aa15c895038
search-nothing-found = Aucun résultat pour « { $q } »
# en: 0ecef6f95577e3e82d8917d2d3e89d1aa83afd09
header-breadcrumbs = Fil d’Ariane
# en: 4cebf6eb94e9c19167d02308623d15bc597b63cd
template-picker-all-apps = Retour aux applications
# en: 3dfae1ccc665881b5464634d32ae1c7a301ac757
field-edit-name = Modifier { $name }

## the Board

# en: e879b0be0190766af9d315adbc46dcd7314f0b3f
board-board = Tableau
# en: 9ea5e97d2f481d5427902c67e55a54ec377e4761
board-board-lowercase = tableau
# en: d1b387380c728b48ad48dad8e820910a5b9823d8
board-cards-in-lanes-by-status = Des cartes en colonnes selon leur statut, chaque carte une ligne d’un tableau de données.
# en: bae7d5be70820ed56467bd9a63744e23b47bd711
board-status = Statut
# en: 8665aed3624f4916345a2b028d6d28d352ad4245
board-to-do = À faire
# en: 9f1ffa416cd0e63113fa0244f18e15e1a1079c18
board-doing = En cours
# en: e9b450d14bc2363d292c84f17cfad5cfbd58a458
board-done = Terminé
# en: cf5fbf174610c73177abf9c8651380a7704db1bd
board-no-cards = Aucune carte
# en: 0463e9010e415ef45e74451772c13dbd858b5db4
board-n-cards = { $n ->
        [one] une carte
        [many] { $n } de cartes
       *[other] { $n } cartes
    }
# en: ec6f345f456be5e906efb61c1bd7cc91fbe8c3d6
board-open-cards-in-spreadsheet = Ouvrir les cartes dans un tableur
# en: 4d4ce73b15660f20977ad7efab2283c51bdae008
board-card = Carte
# en: 8ccf7349a24f44599bb594439759d55772afee20
board-lane = Colonne
# en: 19ccf26dc8e702d98d74975dc1be88ac35befe92
board-lane-options = Options de la colonne
# en: 7f51ca5da34a388508ed9fc5f8ac44c5562f5173
board-options-for-lane = Options de { $lane }
# en: 5e8cce6827d0497950b63c967f9543df9fa8b1a4
board-add-card = Ajouter une carte
# en: 9b16c4bcc3877580d2535eb47b42650501308935
board-delete-lane = Supprimer la colonne
# en: c0a3ef619ab093df30dca80bc872eedfe5850b52
board-move-to = Déplacer vers…
# en: 7b4bff0cec6d8f2a2abd46cfaa219d8214122ca1
board-rename-lane = Renommer la colonne
# en: a5912ab4a43981f406eba8185371c4b3651e648b
board-card-in-lane-beside = La carte voisine dans la colonne précédente ou suivante
# en: a200dd9231cf71181960586345e66a1b8bb3e738
board-move-card-to-lane-before-or = Déplacer la carte vers la colonne précédente ou suivante
# en: f801223b1d000f42a1e7f02ec5f078e77efbbea4
board-lane-name = Nom de la colonne
# en: 4a1eabde691b377e61e564f2b21a56ce7c48f862
board-lane-needs-a-name = Une colonne doit avoir un nom.
# en: f2eaf2b4b185176968749b50d7028a1c89357026
board-lane-name-taken = Il y a déjà une colonne nommée { $lane }.
# en: d1bef7e304cff6b5048ede1892d1cc9c4307b7fd
board-double-click-to-rename = Double-cliquez pour renommer
# en: 141ee07375861e5bb346745bbb11f74b0fcee117
board-double-tap-to-rename = Touchez deux fois pour renommer
# en: b0979c4915315a19ae77b53a28bf2ff42ac97034
board-add-lane = Ajouter une colonne
# same
# en: c6196faeecf27e09514f0812df5e4b0f18a49465
board-lane-total = Total { $sum }
# en: d3f8f7b810c4b08f0b4ac4e47fdf8d265a10d869
board-yyyy-mm-dd = AAAA-MM-JJ
# en: a0cb8ea4060e4a90b3f78592285740f7da401615
board-new-lane = Nouvelle colonne
# en: 8bd7cc004028fed2c431bef5632a5f52a14e1af6
board-title-of-card-n = Titre de la carte { $n } dans { $lane }
# en: bc2748da58d80b5c56727fe18421e38b112a5ae5
board-card-n-tap-chooses-it = Carte { $n } dans { $lane } : touchez pour sélectionner, glissez pour déplacer
# en: 810b76bb164a844386d1a2e79fd6f0580914a82f
board-chosen-cards = Cartes sélectionnées
# en: 485f5f8bdd8f8be4ce2ca76e2531a5d8114df337
board-project-board = Suivi de projet
# en: c1781d58aa2f45b844d09310320a3910191ad880
board-to-do-doing-done-owner = À faire, en cours et terminé, chaque tâche avec son responsable et son échéance.
# en: df5ed7c968260c1206d4e522066460822cf75b92
board-sales-pipeline = Pipeline commercial
# en: e8005f76e068a5cac180467fb97ac33561c72f62
board-deals-from-inbound-to-won = Les affaires, de l’arrivée à gagnée ou perdue, avec leur montant et leur date de signature.
# en: 9ce5d6326186a71d12527fe2a55a6ba56518e0ef
board-hiring = Recrutement
# en: 9fe2a35ad36e6e3d1a54f763c65f2dabd3ad62f9
board-candidates-from-application-to-hire = Les candidats, de la candidature à l’embauche, avec le poste et la prochaine étape.
# en: d52515f227f638ad6d968486abebc20d6729d8c6
board-content-calendar = Calendrier éditorial
# en: 0f84e77fda32b99ff2b28eebd7adca162dcf5f93
board-pieces-from-idea-to-published = Les contenus, de l’idée à la publication, avec le canal, l’auteur et la date.
