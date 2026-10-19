### Tiny Little Office in Polish, as Greenpoint speaks it: the plain second person of consumer software (Ty, the
### imperative). Its ids and groups are en.ftl’s.

## the shell: header

# same
# en: 57f5f5efbc5990f5230aa95359042338b856707b
shell-menu = Menu
# en: 768e0c1c69573fb588f61f1308a015c11468e05f
common-title = Tytuł
# A new document of the app, and one not yet named; { $noun } is the app's noun: "New presentation".
# en: ef9b1a33245907a9a1d7b7c22053168ed660d014
common-new-noun = Nowy: { $noun }
# en: bd2ce96ba3cfd14a4c62847d4e6bb0b8a3c72d25
common-untitled-noun = { $noun } bez tytułu
# en: a479c9c34e878d07b4d67a73a48f432ad7dc53c8
shell-download = Pobierz
# en: 33ce417454bfd838897deaeee2355e818a5d4160
shell-loading = Wczytywanie…
# en: 22456f903bcbdedb06221ade9b87febb47722e40
shell-this-link-holds-something-that = Nie można odczytać tego linku. Mógł zostać ucięty przy kopiowaniu.
# en: 7dfd19fef00f41e899fb6e2753b71ae40ba59e6d
shell-n-of-max-link-characters = Zostało { $n } z { $max } znaków linku
# en: 51a6857d24b72bee0d1e541448d0f9c8fd5b8697
shell-n-characters-over-link-limit = { $n ->
        [one] { $n } znak ponad limit linku
        [few] { $n } znaki ponad limit linku
        [many] { $n } znaków ponad limit linku
       *[other] { $n } znaku ponad limit linku
    }
# en: 1cfbe154225ecb3a01f463f1adde07279f1a454a
shell-n-characters-over-link-limit-short-link-holds-max = { $n ->
        [one] { $n } znak
        [few] { $n } znaki
        [many] { $n } znaków
       *[other] { $n } znaku
    } ponad limit linku; krótki link mieści { $max }
# en: e7722b7943884e579644a3f5bd2b605afd08a156
shell-n-characters-over-what-short = { $n ->
        [one] { $n } znak
        [few] { $n } znaki
        [many] { $n } znaków
       *[other] { $n } znaku
    } więcej, niż mieści krótki link
# Before a document that lives nowhere but its link (Private, changed) is left for another place: the question and its three answers.
# en: f0bba930d38a38cacb48e472c8d4856caa4d8fa8
shell-this-document-lives-in-its = Ten dokument nie jest zapisany
# en: 43454bfced276b8a1b83dea8a0bef1794a9bde60
shell-nothing-is-saved-on-this = Istnieje tylko w swoim linku. Skopiuj link, żeby go zachować, albo zapisz go w tej przeglądarce. „Wstecz” też do niego wróci.
# en: e0ef0b02c240e569b52e799771dbb4fb07b35818
shell-copy-link-and-go = Skopiuj link i wyjdź
# en: fdb4eeef33355eb9aed9f11d6ddcdfe0c08a29ea
shell-turn-on-save-in-browser = Zapisz w przeglądarce i wyjdź
# en: 634bae7c8177155bc24961f3493f425b66e88c16
shell-go-without = Wyjdź bez zapisywania
# en: ee7a39c93b7018b92bcff5511a92081df68dd3db
shell-save-in-browser-is-on = „Zapisuj w przeglądarce” jest włączone. Otwierane dokumenty są tu zapisywane. Wyłącz to w menu.
# en: 97c669558589e3b0cf0917cb9caece8844ba65d9
shell-another-version = Inna zapisana wersja
# en: 87222e82bf5d208052c68fa66c93d131fa18fc67
shell-kept-on-this-device = Zapisano na tym urządzeniu
# en: 266695479a949eec44dea9db4e15fba00163f04e
shell-keyboard-shortcuts = Skróty klawiszowe
# en: bc447a3151935ceff76e781c90fb02c45d25f004
shell-nothing-to-keep-yet = Jeszcze nic do zapisania
# en: 8c00f9130260156b1612126a7cf9a23bb3c553d6
shell-open-it = Otwórz
# en: ef6e207cc7cea57220ad9a73fc6040b0085bf63e
shell-save-in-browser-is-off = „Zapisuj w przeglądarce” jest wyłączone, więc nic nie jest zapisywane. Włącz to w menu.
# en: 3939d97295147954c5488340b1f427ebbfa51e69
shell-skip-to-apps = Przejdź do aplikacji
# en: 286b3810e407b3cef40b582c8ca4b373a58445bf
shell-skip-to-document = Przejdź do dokumentu
# en: 03d9aea1885137ab8ab4d9c24250515cb44161f0
shell-this-device-keeps-another-version = Na tym urządzeniu zapisano inną wersję „{ $title }” ({ $when }).
# en: 25c53c58cba7054a3a2ae9e9b575c7888716ae94
shell-this-link-was-made-by = Ten link wymaga nowszej wersji. Odśwież stronę.

## the home page

# en: 276c9361fff15e60f48af4d733ec83315d2bb251
home-blank = Pusty
# en: f25b700ed9f092123a43acb205a6869342cf9dd6
common-templates = Szablony
# The button under an app's tile, naming the template list: "Start Text from"
# The list of an app's documents kept on this device, under its tile: "Write documents"
# en: c647789831582ba7f4b6aad72ea6f425b98aad6f
home-app-documents = Dokumenty: { $app }
# en: f6fdbe48dc54dd86f63097a03bd24094dedd713a
common-forget = Usuń
# The button that forgets one kept document: "Forget Launch notes"
# en: bbc98cac8e5e1a213d5aa04b3618196a6d28bf49
home-forget-title = Usuń: { $title }
# Under an app's documents, the rest folded away: "3 more"
# en: 84ab0eecfadb6332ee8b1ee5c67852b7df54e66f
home-n-more = Jeszcze { $n }
# en: 7f2352058be05faa9a191d7ac6eb2cf0a15b228f
home-aboard-project-made-with-respect = Projekt { $aboard }. Stworzony z szacunkiem w Nowym Jorku.
# en: a26ce4e876668bb8cdbd6db05cc668d436b73ba6
home-beta-version = Wersja beta
# en: 84add5b2952787581cb9a8851eef63d1ec75d22b
home-email = E-mail
# en: 5b5d9a510b8eb3d8ca42591036a5fb8c0402a674
home-templates-for-app = Szablony: { $app }
# en: 5c88e1ec022720d6a2199c408f861dd61bfdbb08
home-app-templates = { $app }: szablony
# en: 5ea1c79be74b3d7c077d35212d473ca6fbd80c4a
home-templates-for-app-name = Szablony ({ $app }): { $name }
# en: 9b96d854dd8e79adb3ee6e1e0e419b50fc1aed43
home-templates-are-not-saved-in = Szablony nie są jeszcze zapisane w tej przeglądarce. Połącz się z internetem, żeby je zobaczyć.
# en: 25d37d0580af5bc389b9332f3640f6d73ef93e48
home-documents-found = Znalezione dokumenty
# en: 5e46670f6fe68987a7e5c94f03e192aff635df77
home-no-document-here-has-those = Brak pasujących dokumentów
# en: 1dfc2a61eb2345a48a2a91b7922b83f580553732
home-search-your-documents = Szukaj w swoich dokumentach
# en: 4f5fbd7fb6a16b16ebe3c347bf43c9a2455a1560
home-n-documents-found = Znaleziono { $n ->
        [one] { $n } dokument
        [few] { $n } dokumenty
        [many] { $n } dokumentów
       *[other] { $n } dokumentu
    }

## the drawer (hamburger menu)

# en: d9a36850b7f3f78365a998cb16cb68b6fd79400d
drawer-apps = Aplikacje
# en: bbfa773e5a63a5ea58c9b6207e608ca0120e592a
common-close = Zamknij
# en: d6cbbf296e77dd589e704c39eb4d6575d31a1d22
drawer-default-name = Domyślny: { $name }
# en: 1660227e6037ceaaaacebea7ba86a1f92071bd39
drawer-save-in-browser = Zapisuj w przeglądarce
# en: dd8082be77e9211f033a55131c1a6360f12b0e1d
drawer-what-is-this = Co to jest?
# en: fa7684f5e02290b9144d9d981add78ff873eb052
drawer-turn-on-to-save-files = Włącz, żeby zapisywać pliki w przeglądarce.
# en: af191ab94c0b2f93d5e90820805b9c7f419ce80d
drawer-turn-off-to-remove-all = Wyłącz, żeby usunąć wszystkie pliki i ustawienia.
# en: db5f691e51583d80782a9c51e78f01c49ccefd02
common-nothing-saved-in-this-browser = Nic nie jest zapisywane w tej przeglądarce
# en: 15f47f2fab9454be9fab70ba4bd89293fdc40c0a
common-saving-in-this-browser = Zapisywanie w tej przeglądarce
# en: 5e543c55dd0832d9cbbdccc9e22011d240080e50
drawer-remove-all-files-and-settings = Usunąć wszystkie pliki i ustawienia z tej przeglądarki?
# en: 89b86ab0e66f527166d98df92ddbcf5416ed58f6
drawer-language = Język
# en: a797e30923ac1be590300ce6b08e63b4e6dc6688
common-theme = Motyw
# en: 15360c25a66578ad69e81e4c2fc3f0001e8a2258
drawer-match-device = Systemowy
# en: a36ef8aba22905e2d2efbf1ac1d6230d5761859d
drawer-light = Jasny
# en: ae1ef01432946b8976b9b58575b3390ab7644db2
drawer-dark = Ciemny
# en: 6b21fb791ac05170893860c248401cd24a59b732
drawer-about = O programie
# The name itself is translated too (Paul, 2026-10-10): each language says it in its own words.
# en: 515e0d24040d094379cfdc94e3c6c2f63a26f1f6
common-tiny-little-office = Malutkie Biureczko
# en: 399d4aacd52f76ac8090ce08a31e550e2123645d
drawer-about-tiny-little-office = O Malutkim Biureczku
# en: 6218d1c0ab69084ed45fb0f022b95f382310184a
drawer-tiny-little-office-is-experiment = Malutkie Biureczko to eksperyment firmy { $aboard }, zajmującej się strategią cyfrową i AI oraz tworzeniem oprogramowania w Nowym Jorku.
# en: 04a1291dcc6e5d304f04516685710a331963f630
drawer-to-reach-out-with-questions = Masz pytania? { $email }.
# en: 522edc71559293b5713cff3f13c2dbafd37a56a3
drawer-email-us = Napisz do nas
# en: 98187f1688112fa57c00a326f526288fa3e6b023
drawer-if-you-find-bugs-please = Jeśli znajdziesz błędy, zgłoś je w naszym { $github }.
# en: c6651994b242228b647fbbd2a83eccefd957abca
drawer-github-repository = repozytorium GitHub
# en: 0fe421942f09b119f9019d2de286f5a43eefd4f3
drawer-all-of-these-notes-these = Wszystkie te notatki, rysunki i zdania napisane flamastrem blakną z czasem. Trwa tylko to, co ulotne.
# same
# en: 45efc495ed63ce777a86a3f8a9f4475269fb7542
drawer-eugene-ionesco-book = Eugène Ionesco, { $book }
# en: be1c21d6fe0ae49ef2cea2d317a4967da26d015c
drawer-discoveries = Odkrycia
# en: 687c82861c956e47456186f6522cfc8dbadb8ef6
drawer-documents = Dokumenty
# en: a5c79e56eede8d4e922d461872629a01dd41ab77
drawer-find-app-template-or-command = Znajdź aplikację, szablon lub polecenie
# en: 45e5f3f72e961cb70134ba35f7a27a9620e515f7
drawer-commands = Polecenia
# en: b993b0c537190bfc94b21360ac5abe51e56be36f
drawer-nothing-by-that-name = Brak wyników
# en: 85773bc941e47b21f6cc345b225265e3144489be
drawer-add-to-home-screen = Dodaj do ekranu głównego
# en: 9b3cbed5c490c07473546a88768ba29b787e9e52
drawer-size-of-everything = Powiększenie
# en: 943c5ac9fa7766d7c1ebecbc95c4e0d27b4ef9d4
drawer-to-add-tiny-little-office = Aby dodać Malutkie Biureczko do ekranu głównego: Udostępnij, potem Dodaj do ekranu głównego.

## links that leave the site (kit/ui/link-guard.ts)

# The menu button's tooltip: the Office mark is the menu.
# en: 4a48e81d0d023913c2155eb30954f58853a5591d
leave-tiny-little-office-menu = Menu Malutkiego Biureczka
# The question before a link that leaves the site: "You are leaving Tiny Little Office for" over the site's name, large.
# en: 92ad7c004fe14dea34666631ff31b016eb39ee40
leave-do-you-trust-this-link = Ufasz temu linkowi?
# en: 8d85feca3f164857fc84014a8f2ed5cc4846d4c9
leave-you-are-leaving-tiny-little = Opuszczasz Malutkie Biureczko i przechodzisz na
# en: 50ef68d5c205237951dae42aa775a66480171c46
leave-this-link-writes-email-to = Ten link tworzy e-mail do
# en: 102dce223fdc2f3bbdda71f28108e2a6fdf21710
leave-this-link-calls = Ten link dzwoni pod numer
# en: afb8b3199e929e5e9f886fdf382599c9d440c71f
leave-not-secure-address-what-you = To nie jest bezpieczny adres (HTTPS). Wszystko, co wyślesz, może zostać odczytane po drodze.
# en: 003e4888e77a22c782047c7d26d028c5eca46f1c
leave-whole-address = Cały adres:
# en: fdb31cf3fb383190c6864d4effd5fd6041b330cb
leave-someone-wrote-this-link-into = Ten link dodała osoba, która napisała dokument. Tekst linku może się różnić od adresu. Przejdź dalej tylko, jeśli mu ufasz.
# en: 2e0b45f2a456e8db55f08d7b65e87593a3e9a140
leave-go = Przejdź
# en: c0f31f8a18b087fc577cbc50e9d37c68cb16c9ae
leave-links-of-this-kind-do = Linku tego typu nie można tu otworzyć.
# About's last line, a link to the source of the build the site runs: "Running commit abc1234".
# en: 0eda2175601e6a4148c1c8b3f85c330bc7fbcabf
leave-running-commit-commit = Wersja z commitu { $commit }
# en: 45469d1ce86c199fb2984929d6c2e408178f7032
leave-this-link-hides-characters-in = Adres tego linku zawiera ukryte znaki.

## the copy kept on the device (status lines under the switch)

## sharing: the Share dialog (kit/core/shell.ts), where the link fits (kit/share/limits.ts), the arrival banner

# en: 21697833514286cb120912c109ed55e870e44b01
share-copy-opened-in-new-tab = Kopia otwarta w nowej zakładce
# en: ae7b279c96200b853008a352fa110ac2565f3dc5
share-edit-link = Link do edycji
# en: 12355fc4c6eeb80306a7fe5199240b694bf2b85e
share-present-link = Link do prezentacji
# en: bba41b4c62a01956942830c32fc1498945c30fcd
share-copy-into-new-document = Kopiuj do nowego dokumentu
# en: 2f84eea5d45da4f1ce1760b85db18a854f4e1b39
share-copy-link = Kopiuj link
# en: 6e9d1ebfe7124caf277155d2f57b5a6787f30198
share-copy-of-title = Kopia: { $title }
# en: 367f9cb75618d64b28286bdc4a5b8a3f4d7092f0
share-encrypted-here-service-holds-only = Szyfrowane w Twojej przeglądarce. Nasz serwer przechowuje tylko zaszyfrowany link i usuwa go, gdy wygaśnie.
# en: db4fb5a00a9a2172e9d45a362ff1b772884f64b5
share-expires-in-n-days-date = Wygasa za { $n ->
        [one] { $n } dzień
        [few] { $n } dni
        [many] { $n } dni
       *[other] { $n } dnia
    } ({ $date })
# en: ae9d408cb75f0f6745c4a64cb802e6442cc299f4
share-expires-in-n-hours-date = Wygasa za { $n ->
        [one] { $n } godzinę
        [few] { $n } godziny
        [many] { $n } godzin
       *[other] { $n } godziny
    } ({ $date })
# en: a202af448924971f4ffb4dc06ed405775781207e
share-expires-in-n-minutes-date = Wygasa za { $n ->
        [one] { $n } minutę
        [few] { $n } minuty
        [many] { $n } minut
       *[other] { $n } minuty
    } ({ $date })
# en: 0ef0475467d903f5adb0297bbc7979b7b0792d0c
share-opens-as-pages-to-read = Otwiera się jako strony do czytania
# en: 8744400a02796b44742f8f5e5b66216821eab90d
share-opens-in-editor = Otwiera się w edytorze
# en: 7fbbb75c4e853ef0e42da5fe316344fdf1a6143c
common-whoever-opens-this-link-gets = Każdy, kto otworzy ten link, dostaje własną kopię. Jego zmiany nie pojawią się w Twojej. Poproś, żeby odesłał Ci swój link.
# en: 94b01acececc033463cc7731d659fbcae11c2b47
share-short-link-that-expires = Krótki link, który wygasa
# en: fed3d23d480dd0bfe5a0cfff4d9f3dae7857fbe6
share-this-link-expires-in-n = Ten link wygasa za { $n ->
        [one] { $n } dzień
        [few] { $n } dni
        [many] { $n } dni
       *[other] { $n } dnia
    }
# en: 5f55ae03e19eebbbd3a277a7647d0b2ac27c4ec8
share-this-link-expires-in-n-hours = Ten link wygasa za { $n ->
        [one] { $n } godzinę
        [few] { $n } godziny
        [many] { $n } godzin
       *[other] { $n } godziny
    }
# en: a37642996477c73f2e3335a1e06a28d577806b52
share-this-link-expires-in-n-minutes = Ten link wygasa za { $n ->
        [one] { $n } minutę
        [few] { $n } minuty
        [many] { $n } minut
       *[other] { $n } minuty
    }
# en: 04609a8df41f042b261ed7cf06b80c2667badd0e
share-this-link-n-characters-fits = Ten link: { $n ->
        [one] { $n } znak
        [few] { $n } znaki
        [many] { $n } znaków
       *[other] { $n } znaku
    }, zmieści się w SMS-ie
# en: 822e1dca627d6149b0263bdae6477ca56c62a36c
share-this-link-n-characters-too = Ten link: { $n ->
        [one] { $n } znak
        [few] { $n } znaki
        [many] { $n } znaków
       *[other] { $n } znaku
    }, za długi dla { $where }
# en: f9551d11c51a8da0015b0716e3aab327784b2ec2
share-discord-message = wiadomości na Discordzie
# en: 36dec9aa0b166bef869350675231f78529bbabd8
share-a-qr-code = kodu QR
# en: 13be5551761c07ae1735af2e3fbcea08dae3dce3
share-link-in-google-docs = linku w Dokumentach Google
# en: 66ab040bba28a1d3d5307879564a2bf9ff2ae108
share-telegram-message = wiadomości na Telegramie
# en: aba5163784cd5c92d1a33174634785cace589ca8
share-a-short-link = krótkiego linku
# en: c372595cddc6ae62ad3eb2ddfaa7cb6546e4df31
share-small-nfc-sticker = małej naklejki NFC
# en: 7be07ec57c401332cca2718a0d4a6a516b77527f
share-text-message = SMS-a
# en: 1efc6b2c2c837a8ce7a9054983d97158307b3c0e
share-chrome-and-edge = Chrome i Edge
# en: 777a1e3310cf18433544371b9f5422bf0ba0ac80
share-nfc-sticker = naklejki NFC
# en: 219dd04dbbbc2c0867d0f2c748fdc25f6aba89f2
share-some-browsers = starszych przeglądarek
# en: 77437a6dfcf7562798d4a066e19fd698b357c1a8
share-n-short-links-kept-here = { $n ->
        [one] { $n } krótki link zachowany tutaj
        [few] { $n } krótkie linki zachowane tutaj
        [many] { $n } krótkich linków zachowanych tutaj
       *[other] { $n } krótkiego linku zachowanego tutaj
    }
# en: fbdda8ea6ae4f71eb78a8bd78fa2746784806ffe
share-display-link = Link do podglądu
# en: 54c374d4a68f528c4c4022d195a62e22b4bf57bb
share-opens = Otwiera się
# en: c2e98476efb5e35f50dae898c1b56d7085eee7da
share-link-copied = Skopiowano link
# en: 4dfbe46077fcd9769d6688a682515a0cf12a7d80
share-could-not-copy = Nie udało się skopiować
# en: 24897bc1ceb803cb3796e491bc10a252f16a950f
common-share = Udostępnij…
# en: abba02fcdd8b9ce1dde7f39b5b6aa0bd741f0d57
common-qr-code = Kod QR
# en: 7f8c79bef572d079a2e70de568104a605b4050cf
common-qr-code-of-this-document = Kod QR tego dokumentu
# en: 61852524b8f8fb65ef0743aec389512536cc7b64
common-picture = Obraz
# en: 0e66b49d04a43c19bcb2e13a53aff5d174f610fc
common-picture-lowercase = obraz
# en: 22f28423a03ce76e4856d14de46b843c1f27e5b8
common-picture-ellipsis = Obraz…
# en: dd722264c1ee9eec4920b634875457cebfc388e1
common-picture-not-kept-here = Obraz nie jest tu przechowywany
# en: 3166432a2daa014cff73f0912bcdc3208242fbe6
common-picture-kept-by-this-page = Obraz przechowywany przez tę stronę
# en: f12c273d1ebff17c0cf1acc1622ee371adc8825a
common-picture-too-large = Obraz jest za duży: tu przechowuje się do { $max }
# en: 5987984bd3953aa88448226f480b1c67ad98ab52
share-this-document-is-n-bytes = Ten dokument ma { $n ->
        [one] { $n } bajt
        [few] { $n } bajty
        [many] { $n } bajtów
       *[other] { $n } bajta
    }, a największy kod QR mieści { $max }. Skróć go o { $over ->
        [one] { $over } bajt
        [few] { $over } bajty
        [many] { $over } bajtów
       *[other] { $over } bajta
    }, a się zmieści.
# en: 716ebea121ec7b8a4dd9ea47314131122cf0aab1
share-this-document-is-n-characters = Ten dokument ma { $n ->
        [one] { $n } znak
        [few] { $n } znaki
        [many] { $n } znaków
       *[other] { $n } znaku
    }, a krótki link mieści { $max }. Skróć go o { $over }, a się zmieści.
# en: ae5014875f1eec5203f8744323723d2ee679d1cc
share-expires-after = Wygasa za
# en: 1e1c72c2e33894ad38b820f1d4ed17ef478067be
share-hour = Godzinę
# en: 4286c1f81faa848587ed38925e9b181e939f4998
share-day = Dzień
# en: 51e2a8b00255a6db1c49b306e7ac28f2e6ac9a23
share-week = Tydzień
# en: 6d17c3840dec7c16f42f223c4a5472efbbff08c1
share-month = Miesiąc
# en: 38c22f9dbdb41d2131b4324b7722c45a1f543420
share-make-short-link = Utwórz krótki link
# en: 94d7d8ee473f817fa4b57737e7a01ec3cd13d4d4
share-making = Tworzenie…
# en: 1c6c031b40782efe6b28678fc42d5569cc11e029
share-hundred-links-day-from-one = Osiągnięto limit: 100 krótkich linków dziennie z jednego adresu. Spróbuj jutro.
# en: 0b5140c5b10a2b84301b5ef43056b7d89bd2187c
share-short-link-cannot-be-changed = Krótkiego linku nie można edytować ani usunąć. Wygasa automatycznie.
# en: 4d9182a72e391841c2817e9943cf2b07adf70220
share-could-not-shorten-link = Nie udało się skrócić linku.
# en: 4c0067d6b6bd96cdab1ae363ce342312a93834fd
share-this-document-is-too-long = Ten dokument jest za długi na krótki link.
# en: a4d0b704a911979249dd2629e81a0205fab0aa44
share-up-to-hundred-links-day = Do 100 krótkich linków dziennie z jednego adresu.
# en: e963907dac5cd5c017869b4c96c18021c9bd058b
share-remove = Usuń
# same
# en: d0517071aa376e797705058bbad4b658954b9930
common-link = Link
# en: b15dbf0da72e08fcfcf35d2aed0a937335b9cc5e
common-short-link = Krótki link
# en: 9095e39b9975250b05476c852d1631a6651924d9
share-new-noun-date-n = { $noun } { $date } #{ $n }
# Files, compare, posting and embedding: the agent and sharing surface.
# en: 1c2edb3104c7f2adce9ad2a77f3622d1beb0059a
share-mastodon-server-like-mastodon-social = Serwer Mastodon, np. mastodon.social
# en: 64fbd995d3b6b156ee26ae3c03e6516434c34c12
share-change = Zmień
# en: 2a07ce9a22d8e5dc1031e531518f04e50855319f
share-copy-embed-code = Kopiuj kod osadzenia
# en: c3e1c83e5b4172d3c738e37cb69b76d93ce49b8b
share-copy-show-link = Kopiuj link do pokazu
# en: ad02e14e2841dfbd22ab2caa12b5541c5b01a53a
share-embed = Osadź
# en: 4eeede7134d362f371fd18b2d63d3199bb24f01a
share-embed-code-copied = Skopiowano kod osadzenia
# en: 682cbb0f328f16ee213c6b44d7012512b55506b7
share-opens-deck-already-presenting = Otwiera prezentację od razu w trybie pokazu.
# en: 7858ac3ff63354f37161bd349efe11edd13b89cb
share-post = Opublikuj
# en: c68fca11627c0ac342583c1782892518730cc40b
share-post-link = Opublikuj link
# en: 82584c3ce64f57a310db6846c65628266a88c44d
share-show-preview-of-first-page = Pokaż podgląd pierwszej strony
# en: ac1624e1fa626a4ba8b8ee419f0cf118d53fa480
share-picture-of-first-page-and = Obraz pierwszej strony i tytuł pozostają czytelne na naszym serwerze przez miesiąc, żeby sieć mogła je pobrać. Sam dokument nie.
# en: 6a46f4b4b3f001e64ef9652412aa1ddbdeabc489
share-shared-without-preview-reason = Udostępniono bez podglądu: { $reason }
# en: 4def5924266f682e91bcdff1e5ba510a20a36902
share-making-preview = Tworzenie podglądu…
# en: b0e8d8d6d97acaeed4ad09f7b25699817638ae6b
share-page-could-not-be-drawn = nie udało się narysować strony
# en: b3dcb32d0d95afbd62938ff614915e68ba996861
share-picture-is-over-400-kb = obraz ma ponad 400 KB
# en: 398d796772eebe6fc3207881d76d2cf9f155da3f
share-server-could-not-be-reached = nie udało się połączyć z serwerem
# en: 686fd096a5f35bcfbcdcc5130d1be03e593d7bfa
share-hundred-previews-day-from-one = sto podglądów dziennie z jednego adresu
# en: 959db3cd3ff1a424890a809f9cf7445f37db3289
share-server-refused-picture = serwer odrzucił obraz
# en: af490175b729a82a4315134642a89f1f87681967
share-pages-in-frame-on-another = Strony w ramce na innej witrynie, z linkiem, który otwiera je tutaj.
# en: 9377de06278eacbdf4a297a82b8eb9aa3d4220c0
share-your-mastodon-server = Twój serwer Mastodon
# en: fccb3597262f866e1c1f6a9f20bdd2439a0370b8
share-this-link-n-characters-n-bytes = Ten link: { $n ->
        [one] { $n } znak
        [few] { $n } znaki
        [many] { $n } znaków
       *[other] { $n } znaku
    }, { $bytes ->
        [one] { $bytes } bajt
        [few] { $bytes } bajty
        [many] { $bytes } bajtów
       *[other] { $bytes } bajta
    }
# en: 525f61b6729229b1a8854a9e50bcaa52ea96b131
share-where = Gdzie
# en: 55f653107f261dcc84be0568f5812694250f2e96
share-max-link-sizes = Maksymalne długości linku
# same
# en: 24d948e4bdbe5b8224bbc0dfbab1923fab00b98e
share-limit = Limit
# en: f9f775ef8d81d0adcdb54a1de51a58a5ab9d24f6
share-fits = Zmieści się?
# en: 0e1a1a74c78e1f4b6e8efcb92b18aea677212d76
share-n-characters = { $n ->
        [one] { $n } znak
        [few] { $n } znaki
        [many] { $n } znaków
       *[other] { $n } znaku
    }
# en: 1991ca167949231900aa143e63134d2584d8de83
share-n-bytes = { $n ->
        [one] { $n } bajt
        [few] { $n } bajty
        [many] { $n } bajtów
       *[other] { $n } bajta
    }
# en: 36f6b0318377bb84249e4845275fa2c4e63ebb37
share-no-published-limit = Nie podano
# en: 5397e0583f14f6c88de06b1ef28f460a1fb5b0ae
share-yes = Tak
# en: f37d6e1b1ff2eeb01d7bee0aadef337300b9db53
share-yes-n-left = Tak, zostało { $n }
# en: 63dfcadd40126551301f363efd454c7d2c610b94
share-no-n-over = Nie, { $n } za dużo
# en: d2857acb2857d3f0021e0ffbcfc8730c9a6e2548
share-yes-counts-as-n-of-max = Tak, liczy się jako { $n } z { $max }

## privacy (kit/share/privacy.ts, kit/ui/privacy-dialog.ts): the password, what the device holds

# The Share dialog's head line: "Created 9 Oct 2026, 14:03 · by Paul".
# en: 07fd5d289286fa4714b3f407db7875fac90b9952
privacy-anyone-with-link-will-need = Każdy, kto ma link, będzie potrzebował hasła, żeby otworzyć dokument. Nie da się go zresetować. Jeśli je zgubisz, dokument przepadnie.
# en: 8c684290ce0b8a8e6cee79a145e17554064a4760
privacy-change-password = Zmień hasło
# en: 5be0d11b94b1ba25b2579314f6af69649a900cde
privacy-created-date = Utworzono { $date }
# en: 39e64aebf907392389952dded5e20ab4836d876a
privacy-enter-password-to-open-this = Wpisz hasło, żeby otworzyć ten dokument.
# en: 554393a215e479d023a30091a1394f7ca57690e1
privacy-forget-everything = Usuń wszystko
# en: 715727cdd46f1bd0703c9e846fcdd4f369ef8313
privacy-preview-sent-with-link-to = Podgląd wysłany z linkiem do sieci społecznościowej to obraz pierwszej strony, tytuł i pierwsze słowa, czytelne na naszym serwerze przez miesiąc. Sam dokument nigdy tam nie trafia.
# en: a584ece11551d9b1a79856743236c51aba50c44f
privacy-forget-everything-this-site-keeps = Usunąć wszystko, co zapisano w tej przeglądarce, i przestać zapisywać? Twoje dokumenty nadal istnieją w swoich linkach.
# en: a798882f1c31099bb9500e2da62c0874d8dbed78
privacy-locked = Zablokowany
# en: a543040c9fee74b4b34282797abbf59e9d2c99b7
common-locked-document = Zablokowany dokument
# en: d850ee188c7c55b64bc3624534de5c5051a57dc6
privacy-new-password = Nowe hasło
# en: 1851836868be57a15ca3684a090210f53c7a98f8
privacy-no-password = Bez hasła
# en: 6eef6648406c333a4035cd5e60d0bf2ecf2606d7
privacy-none = Brak
# en: b1b8530bbd687503cb5486e906942912fb68c231
privacy-opening = Otwieranie…
# en: 8be3c943b1609fffbfc51aad666d0a04adf83c9d
common-password = Hasło
# en: 114bea5817640fe6b9eeec86b939ec0e9a7b6d76
privacy-password-removed = Usunięto hasło
# en: ad1909e464528c140bf96a21ce9adda2464956c0
privacy-password-set-link-holds-only = Ustawiono hasło. Link jest teraz zaszyfrowany.
# en: dce69146962b392ae2b157aec604eface36e90c0
privacy-password-ellipsis = Hasło…
# en: 9dfd349ebee555eb8d652be20dad971cae439eca
privacy-preferences = Ustawienia
# en: cf01481f626d5127ec7732fcbdb29504f08abefd
privacy-privacy = Prywatność
# en: cefceeebf3cd6d02ddc7aca8c769881a5341e829
privacy-nothing-saved-in-this-browser = W tej przeglądarce nic nie jest zapisane. Elementy z listy zostają tylko na tę wizytę.
# en: 626a605da9dbcd888eadcad13deebd3a64011c0a
privacy-protected-by-password = Chroniony hasłem
# en: acef17d00b9a1b6e1e15e76d27ae53635928a7a6
privacy-remove-password = Usuń hasło
# en: 788f55b0957b15918c6aba279f4f0377a5a1db90
privacy-sealing = Szyfrowanie…
# en: 94408e41c12e924b82da7ea6e79e5cb69ac9e042
privacy-set-password = Ustaw hasło
# en: f897cb67f049674308a073079bd85ad0649f8c82
privacy-short-links = Krótkie linki
# en: c706d94b54ef0b520420dd58063cfc78bc88c7e3
privacy-set-password-in-share = Ustaw hasło w oknie „Udostępnij”
# en: e546afa59de2ec4b23ca6c4fafbaddac7bab9240
privacy-short-links-made-here-until = Krótkie linki utworzone tutaj, do czasu ich wygaśnięcia.
# en: b556bf027f9123d39581babef7e15564c24866da
privacy-their-names-and-links-for = Nazwy i linki, widoczne na stronie głównej.
# en: 5300fdca86b5b32fd463f73704e318a2b8fa9961
privacy-theme-lifetime-of-short-links = Motyw i ustawienia krótkich linków.
# en: 0c6a2cfe53459957b6899930a2e5cd46b6541cec
privacy-this-document-has-password-link = Ten dokument ma hasło. Link i każdy utworzony z niego krótki link są zaszyfrowane.
# en: 0d21e52aba49ee4331213463b46c2ece33ad3cf4
common-this-document-is-locked = Ten dokument jest zablokowany
# en: 1dc606b1828a1e2f5bbbed9ed30fa3a80712e3d8
privacy-this-document-is-locked-with = Ten dokument jest zablokowany hasłem.
# en: 1526a17ee7570e6235eb76a6fef8ce4b6d9a3486
privacy-unlock = Odblokuj
# en: 887b0828ec99930408eb32249f1209057b1b234c
common-unlock-ellipsis = Odblokuj…
# en: ce3661a255464b1b22e6f395685d0e6f9fa077da
privacy-what-this-device-holds = Przechowywane na tym urządzeniu
# en: 8485be9e7b3e998c5f1eef5ce87d2aa67726e3cb
privacy-your-documents = Twoje dokumenty
# en: d21905a9907932f7976e1ca96129c0af871f2715
privacy-your-browsers-history = Historia Twojej przeglądarki
# en: cdff70e571d4ed7aeb1a43cedaf33299bdcd258e
privacy-every-document-opened-here-in = Każdy otwierany dokument, w całości, chyba że ma hasło.
# en: 18b8a03ed6567555edd5005aab5b090984f4b5bd
privacy-not-ours-to-clear = Nie możemy tego wyczyścić
# en: 3ca2d1d26637d42b974b313bb8ce231333179a9e
privacy-by-name = autor: { $name }
# en: a9e72cf83916d4381012a19b329292818f845a43
common-n-documents = { $n ->
        [one] { $n } dokument
        [few] { $n } dokumenty
        [many] { $n } dokumentów
       *[other] { $n } dokumentu
    }
# en: 1a8f1553a9832c92927784f88f31a89cd991e803
privacy-n-links = { $n ->
        [one] { $n } link
        [few] { $n } linki
        [many] { $n } linków
       *[other] { $n } linku
    }
# en: 2ddd4097832d991c46023732a889beeb8ec4c29d
privacy-n-set = Ustawiono: { $n }
# en: a97ce1edde4ad396d1cff34063087d0bf5d0e1a8
privacy-copy-this-and-send-it = Skopiuj to hasło i wyślij je osobno, nie razem z linkiem. Nie zostanie pokazane ponownie.
# en: 7640428ae16fc2b673d689ddf6b1ea15eed407d3
privacy-make-another = Utwórz inne
# en: 9a0081f0b2bff82fac1961a403734134b9a3b170
privacy-password-copied = Skopiowano hasło

## a document locked with a password, placed inside another (kit/share/locked.ts, kit/ui/locked-doc.ts)

# The card drawn where it sits; { $app } is the app's name: "A Spreadsheet document, locked with a password".
# en: db4307e70c2d2722c2af2f79643b28e73325e9be
common-with-password = Zablokowany hasłem
# en: fa27fac915c0c87aec9006392ae6422f59857f5d
locked-app-document-locked-with-password = Dokument ({ $app }) zablokowany hasłem
# en: 49db1d83c8636baba474ad11626b5a7c5260976f
locked-with-password-unlock = Zablokowany hasłem. Odblokuj…
# en: 507e778ae244911abcb05b73967febd0edb425a5
locked-document-locked-with-password = Dokument zablokowany hasłem
# What one of them is called in running text, as an app's noun is.
# en: 78ed9fb58f4437d5d29cf78ba699a560017abe47
locked-document = zablokowany dokument
# A placed document whose link cannot be read (cut short when it was copied).
# en: 0c45986cb6755e463398a592a861baaf44018954
locked-this-document-cannot-be-read = Tego dokumentu nie da się odczytać.
# en: a2a127edeb3eed5dc264fc299b034db6493e1636
locked-that-password-does-not-open = To hasło nie otwiera tego linku. Jeśli na pewno jest dobre, link mógł zostać ucięty przy kopiowaniu. Poproś o niego jeszcze raz albo o krótki link.

## words several apps share

# A menu of what can be done to the document as a whole (the Presentation Builder's submenu).
# en: 6e16ec256749730ccec984c8efeb7804db5b9737
common-this-document = Ten dokument
# { $task } is the task's words.
# en: 15f18f71eefc9fedc6fedd434c2edc6a919bf130
common-done-task = Gotowe: { $task }
# en: 00c65041972e0368c2c8b452d60c0a0754fcc9bd
common-drag-to-move-tap-to = Przeciągnij, by przesunąć; stuknij, by zaznaczyć
# en: 525df57dc3610e74377113b92951476bb9387e4d
common-move-left = Przesuń w lewo
# en: 3a43e56f34dece6eb3d79dee1eff7b2f87db6040
common-move-right = Przesuń w prawo
# The group heading the Calendar and the Trip Planner sit under on the home page.
# same
# en: ae2f98a099fe5855c31126233e9c13641ee7fdba
common-plan = Plan
# en: 9985434cd07212b8dac01f8e015a1fa8adac9a99
common-chosen-tasks = Zaznaczone zadania
# A link that opens the document (kit/ui/compare.ts).
# en: cf9b77061f7b3126b49d50a6fa68f7ca8c26b7a3
common-open = Otwórz
# en: 7bb0ddf9221c03b806b03c209e8366000124aa15
common-task = Zadanie
# en: 090ec5f560fc50377fcd95e5cda128e91b276e98
common-tasks = Zadania
# en: 1835508670fb85faefa88cd88d4f57d3cdb00716
common-find-app-doc-template-or = Znajdź aplikację, dokument, szablon lub polecenie
# en: 0d47323c5ee8dde30a5ca28f6ed6103d42081b97
common-in-this-document = Znajdź w tym dokumencie
# en: 733a5f2fb910bb704c7993cae3d8224558d405de
common-indent-or-bring-out-in = Zwiększ lub zmniejsz wcięcie elementu listy; następna komórka w tabeli
# en: bf6e36633c2362cb7fa31a0e8f833388a49ba28c
common-move-selected-items-up-or = Przesuń zaznaczone elementy w górę lub w dół
# en: 989fe994e413c509c03d3dd229b775a3ddc4707b
common-nudge-shapes-in-hand = Przesuń zaznaczone kształty
# en: b11d72438f1b00b65769e9b8597829583dc4d631
common-select-all-words-of-box = Zaznacz wszystko (najpierw to pole, potem cały dokument)
# en: be76d0b25853b431767ca5b5d57ef569bbc6ff2a
common-back-to-words = Wróć do tekstu
# en: 0c0b01d469faff60dc3b2d1c035ee0a7caa03852
common-extend-selection = Rozszerz zaznaczenie
# en: 11a8a25332234992a14424d8aad6fb9ce3d3b287
common-next-or-one-before = Następny lub poprzedni
# en: b4365b2ed2016713788d08335e5157985010ac28
common-step-out-close-collapse-let = Zamknij lub odznacz
# en: fb2997642419cda8393061543f140d40a9323957
common-check-or-uncheck-task = Oznacz zadanie jako zrobione lub nie
# en: 0a4adf12f01d48ecdb89f5eddf5f19fd89d94522
common-too-long-for-qr-code = Za długi na kod QR: skróć dokument albo udostępnij krótki link.
# en: 1e14a1c5e931f6ef8ce8378377366f3c68cef56c
common-n-of-count = { $n } z { $count }

## downloads

# en: 5b221e9c2a451799d8f37e2b9874409d5e03ab05
download-print = Drukuj
# en: f304fc6dd3e87a37a6c53cb62344c10a789a7ad9
common-print-or-save-as-pdf = Drukuj lub zapisz jako PDF
# en: 473b3126e859286ef98d231328fa11a3216823a1
download-picture-png = Obraz (PNG)
# en: 3ad1b6c4e3dcf07e9ac0c95d5303f7ca4f89e55e
common-web-page-html = Strona internetowa (HTML)
# en: 1ba61ab4dec3fa0358c9ed0c77d6ac46f598a1f2
download-text-tlo = Tekst (TLO)
# en: 840a0fda84379bffc2a266a92bbb990672a7c8d2
download-data-json = Dane (JSON)
# en: f77017c03d9d2be93a74ef7ef7e099dd77976f01
download-downloaded-name = Pobrano { $name }
# en: 01125e1be1f56cdaa47c6314a158e1219af819b3
download-failed = Pobieranie nie powiodło się
# en: e7f6a6728b280414756d238ae70084720018ba47
common-open-in-tiny-little-office = Otwórz w Malutkim Biureczku
# Under a document cut off at a slide's foot: a link that opens it whole, in its own app.
# en: c510d6c04c0951500c8e43f623e9f8886c378aec
download-see-more = Zobacz więcej

## the bar, shared by every app

# en: 95802daab3a23990338179f72248350c1434cf39
common-insert = Wstaw
# en: 19e07430eed6d97d6d73cb4a2967b1f316520f54
bar-bold = Pogrubienie
# en: 1616e2e5405e69c4e3914c67c644a9bd3ac00956
bar-italic = Kursywa
# en: 39773aa3efa19090c918baedac1fe737dea25b92
bar-underline = Podkreślenie
# en: a93b9a6808a95ca93515164188159659017155cb
bar-strikethrough = Przekreślenie
# en: e1da9275bc5b420601738531d5e4445b44e0e6e9
bar-highlight = Wyróżnienie
# en: a3089b7fae27bca3309070e0487079a25b8f1ede
bar-heading = Nagłówek
# en: dd870cfcae5fa76d524491679a57b27d41ffb462
bar-bulleted-list = Lista punktowana
# en: 8294ea4f78d097513144a9b8ba4e6d545a2a19e1
bar-numbered-list = Lista numerowana
# en: 0424f6e7026fa4bc2c4a7043083417315113c79b
common-table = Tabela
# en: 40e31a210a1913fd0a8b28b892780996d154c70d
bar-footnote = Przypis
# en: eb9a4bc1c0c153e4e4b042a79113b815b7e3021d
common-date = Data
# en: 39fc72124884d6573e4f9f89585f071ed0782696
bar-undo = Cofnij
# en: 471b94d402d16a5fe7549d001a68ada1f7ddb16f
bar-redo = Ponów
# en: 24345a14377fd821d3932f4e82f6431640955b0b
common-today = Dziś

## the editor (<to-text>): chips, cards and the bubbles

# A footnote's mark, and its words where the notes are drawn, by its number: spoken.
# en: f91f3abb5afff1229edcc701ea915aadef98aca8
common-footnote-n = Przypis { $n }
# A card standing for another document held in this one, of a kind no app here reads: "abc document".
# en: ae6aebc074024e9de875113693a49f1e19bf555f
common-app-document = Dokument { $app }
# The same card when its app is known; { $noun } is the app's noun: "A spreadsheet".
# en: 3f77d60418ea2f6a04196c1e67715b3007390e77
common-noun = Dokument: { $noun }
# en: adac69379a626c2436948a4ef1792c7d719ef929
editor-code = Kod
# en: 6512ee1541e9a6c52d5bf7cf465332e8df25ea3c
editor-connection = Połączenie
# en: 86ccb2898e6f07a6967cf007c54e365e26ba776c
editor-n-rows = { $n ->
        [one] { $n } wiersz
        [few] { $n } wiersze
        [many] { $n } wierszy
       *[other] { $n } wiersza
    }
# en: 221e4b1822bb3e80534c57d63a89d0f58d85c77b
editor-notes-words = Tekst notatki
# en: e9b450d14bc2363d292c84f17cfad5cfbd58a458
common-done = Gotowe
# en: d70f93df5e8f9b55be44fbeee9d203972e3383d4
editor-address = Adres
# en: 74d3b25667541c75d79e0558305f4bda62229bd7
editor-not-address = To nie adres
# en: c8648f259049ce8bdb49529963c37a97f75e8d4b
editor-set-link = Ustaw link
# en: d2de1a2831e7fee28d6c8d214b66da0d1bed30c8
editor-open-link = Otwórz link
# en: f377ac75602950b2c36449de5bceb3c12333ac77
editor-change-link = Edytuj link
# en: 8d48d1f9e74c4fecd89a67645ca3593ef0964710
editor-remove-link = Usuń link
# The selection bubble's name: what can be done to the words selected.
# en: 041a5dec481d6bf0724caeaa84bc135d7d9062d4
common-format = Formatuj
# en: e5fd9cfe0e8039111d54b588e77b2bb0cad41c3a
editor-done-lowercase = zrobione
# en: 4ed7199b77561b7a7c013f7a8504b6686496302d
editor-not-done = do zrobienia
# en: 984cfca8d70e0b1e37a9e70c98a219bb12a05f23
editor-bold-italic-and-links = Pogrubienie, kursywa i linki
# en: a983f10d71bb808f58795f6ae728a6e76f08ce78
editor-one-of-words-column-holds = Jedno ze słów, które zawiera kolumna, albo nowe
# en: e31d972229de381b461860014dd710856361917a
editor-option = Opcja
# en: eb883fb88ed57f39b760fee6ee8f5a04a8cdc7ba
editor-this-browser-lets-page-paste = Ta przeglądarka pozwala wklejać tylko z klawiatury lub z menu Wklej.

## the example in the kit's own documentation

# en: a76d4605993fe042c6e171382b1fba057fa31ff7
example-n-slides = { $n ->
        [one] { $n } slajd
        [few] { $n } slajdy
        [many] { $n } slajdów
       *[other] { $n } slajdu
    }

## the Word Processor

# en: e8e834c4d268a3032b26958914d01ef0addf080e
common-word-processor = Edytor tekstu
# What one of its documents is called, in running text: "Untitled document"; each app's noun is in its section.
# en: 4f8278c89ad16da05fec4fdfc61fe44798b92720
write-document-lowercase = dokument
# The group heading the Word Processor sits under on the home page.
# en: d26d55c7f815c82cf430c3915b3bb833d3f02e5e
common-words = Tekst
# en: 703864836e29b00a7c7490f714fd2d18474de840
write-words-on-page-headings-lists = Słowa na stronie: nagłówki, listy, linki i przypisy, tabela, która liczy, do druku na papierze letter lub A4.
# en: e214b8a29923056887b7edf6635d90dcbb2abe88
write-document = Dokument
# en: 6e660ac1c8b81a53e302f6bb0298551ec820eceb
write-here = Pisz tutaj.
# en: 6b8ad00f4398c3aa47f82637d019dad9e4f9da0c
write-subheading = Podtytuł
# en: 05058e0b630498611ebc41894f7b1670dcd5870e
write-paragraph = Akapit
# en: b4d812c8bee8056808c14f1b31b6765342c8437e
common-bring-out = Zmniejsz wcięcie
# en: aacf42132cce6cf5c1608a5d27f90fcbf93ae851
common-indent = Zwiększ wcięcie
# en: c83b0ec2d98a2ca38077be2f03102aedeb0ab261
write-align = Wyrównaj
# en: b442b455b6a5e55f249769068c3fcc4832aea89d
write-align-left = Do lewej
# en: a2391118c8141b7f016207cb0da015ce9b3323e4
write-center = Do środka
# en: 9bb446b31da260be7a0206a0e15270eb6bf47255
write-align-right = Do prawej
# en: 536d2746f7f2f88df35515a9cd5e44cb1582b9ca
write-justify = Wyjustuj
# en: 2ed7f99f153a2a3dd123644137db651eb191b2b2
write-paper-paper = Papier: { $paper }
# The Look menu: each look's name, then a line about it drawn in its own type.
# same
# en: c1ccf83eea101ddafb5de4e3dea5f3693ae473c0
write-sans = Sans
# en: 2fa97b3a9a6621a3a887ef5686bf4604fa6804e6
write-clean-and-plain-throughout = Prosto i czytelnie w całym tekście
# en: 56632c1841ab67cf1e7c7179b9c5ea0e32ea81c1
write-bookish-serif-throughout = Książkowy krój szeryfowy w całym tekście
# en: 7daed9b46fb34186159d19a2dca5208daf510f54
write-monospace-ragged-right = Krój o stałej szerokości, nierówny prawy brzeg
# en: 9ec6ab25de9a050b550600a98c5a63e5b2c00bf8
write-serif-and-sans = Szeryf i sans
# en: b3ca8ebc46d597ea38c5f4877cf7ae7bfb4e3d68
write-serif-headings-sans-text = Nagłówki szeryfowe, tekst bezszeryfowy
# en: e0c6a397d49350373ed4d55573e9365c212631bc
write-sans-and-serif = Sans i szeryf
# en: d9d9d24d3963e4acfa41725ddd5a228f70b0869f
write-sans-headings-serif-text = Nagłówki bezszeryfowe, tekst szeryfowy
# en: f69f233005f15802770fd26fbf7ead52ec13d9e6
write-book = Książka
# en: d242210a93b0f91c16b76df2eaf8efc7ae211585
write-justified-indented-small-caps = Wyjustowany, z wcięciami, kapitaliki
# en: 5ebe6500747dd5dbad08cc1b33d55fac89ccbe97
write-newspaper = Gazeta
# en: ed0ae2181b2137e6b9f63fdbaeed415ac7e73502
write-narrow-headline-two-columns = Wąski nagłówek, dwie kolumny
# en: 62fb6cfda0506f0ed73ad066151086d3eed2296d
write-horizontal-rule = Linia pozioma
# en: 2650fe50995b55bcff1a125aa230176fe066818a
write-describe-picture = Opisz obraz
# en: bded7b8308bd918ea1d8237a90927f56efe6a030
write-words-for-the-picture = Słowa dla tych, którzy go nie widzą
# Insert ▾'s rule in a document: what follows starts the next page.
# en: 830b8871f026d13b7b94d6723471f2b4e152e360
write-page-break = Podział strony
# same
# en: 9ce3bd4224c8c1780db56b4125ecf3f24bf748b7
common-ok = OK
# en: f2dc2c1e1465864ffbc4e8100c86cfeeafc4fffe
write-this-card = Ta karta
# en: 1e06557fc0660e50a99fa6eef90bff822411e3ae
write-open-in-app = Otwórz w { $app }
# en: 108add9c9b3eed03ee5eb57783d780a485840218
write-locked-worked-out-for-you = Zablokowane: obliczane
# en: ec0c3b76630fd745381cc215a284820af75a683a
common-footnotes = Przypisy
# en: 5c71d5f47999af43b0a80e72abd8e5b79e736f80
write-back-to-footnote-n-in = Wróć do przypisu { $n } w tekście
# en: 6bc94b9eb554810d980ae7fb5673badbbb0b531c
write-back-to-text = Wróć do tekstu
# en: be51f46400fec04e375ba1ea35d98d05b69a1a2e
write-n-words = { $n ->
        [one] { $n } słowo
        [few] { $n } słowa
        [many] { $n } słów
       *[other] { $n } słowa
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
write-add-column-before = Dodaj kolumnę przed
# en: 9b3acfc74a5d37d699868ade0ed3d142024174cf
write-column-c-what-it-holds = Kolumna { $c }: typ, nazwa, dodaj lub usuń
# en: 1f01479a40aa348fc273d4d09636403f89eff717
write-table-move-copy-or-take = Tabela: przenieś, skopiuj lub usuń
# The templates
# en: cfd76febbb671e54b2f280128fb5c317389758a7
write-a-letter = List
# en: 7456f1ce5f81c497b66302751f617f60612306f6
write-your-address-date-greeting-point = Twój adres, data, zwrot grzecznościowy, sedno sprawy, pozdrowienia.
# en: ae3cd6584a49de52c70c1e00ae0a02c8abab166b
write-meeting-notes = Notatki ze spotkania
# en: 7bbe470d4a5d9510c0fcb6844b519d118681beb7
write-agenda-what-was-said-what = Porządek obrad, co powiedziano, co ustalono, kto za co odpowiada.
# en: 9fb58963c66db0c8ca7c638f491e82246e226d30
write-resume = CV
# en: 3f3c7baad1c18a4ab23412f60d65b5179346006d
write-name-and-contact-experience-education = Dane kontaktowe, doświadczenie, wykształcenie, umiejętności: CV na jednej stronie.
# en: 5a0ba3bb83f0992ba00ae94db6a7464210c40711
write-contract = Umowa
# en: 50899f480b3395ee509689b06672ad9d8719e082
write-plain-words-agreement-what-each = Umowa prostym językiem: co robi każda ze stron i jak się kończy.
# en: f9f38818c406d0878defb17a2356e1a2c658861a
write-invoice = Faktura
# en: 4e056cf73efd0995ce1e7c5fd88900894935896c
write-who-what-and-how-much = Kto, co i ile, sumy policzone w tabeli; wydruk do wysłania.
# en: 80c40a5c8be53118fd8a9fc487b43f20c3014fbc
write-cover-letter = List motywacyjny
# en: fe727759e1b85df4a1d71348a1a6dfd6ef8e135d
write-applying-for-job-position-what = Ubieganie się o pracę: stanowisko, Twoje doświadczenie, dlaczego właśnie ta firma, w czterech krótkich akapitach.
# en: 1fd79b9555ddf59862d60aa0aa3bb74fb74aae78
write-memo = Notatka służbowa
# en: cfa5a189ad757d015661acb500917a198d8a13e1
write-to-from-date-and-subject = Do, od, data i temat; zmiana w jednym zdaniu, dlaczego i czego oczekujesz w odpowiedzi.
# en: 092f99ea11a34a8490e7a767a83a42fc45634f82
write-minutes = Protokół
# en: 34dbbbeddd62f120a000701c56adebc8bae95352
write-formal-meeting-who-came-treasurers = Formalne zebranie: kto przyszedł, rozliczenie skarbnika, wniosek i głosowanie, zadania.
# en: e04a25d1f69061bfe7770b16891fca2c413bcbe0
write-one-page-cv = CV na jednej stronie
# en: 11628c83c5de19d1338628ed7153b648f496b27c
write-typewriter-set-cv-now-before = CV jak z maszyny do pisania: teraz, wcześniej, wykształcenie, języki i narzędzia.
# en: 6ed05e720ccc3ef269db1b38201da8b873acc895
write-newsletter = Biuletyn
# en: e583899cf44dbc07e6d8d4e7a252d39552e4e3d4
write-block-associations-month-dates-in = Miesiąc stowarzyszenia mieszkańców: daty w tabeli, powitania, wieści i podziękowania.
# en: 1dcda804c96da3cc7e73e8a1672d4379a741f11a
write-recipe = Przepis
# en: 72490fa559ee9ce5ed498b58b3e2cad900af7155
write-what-you-need-in-table = Składniki w tabeli, którą przeliczysz z czterech na sześć porcji, i przygotowanie krok po kroku.
# en: aa3ddab4d749b73414ddd65201f9c6553b98a49b
write-questions-and-answers = Pytania i odpowiedzi
# en: 1854b96dd11603bed03cce723369ef661a6f34f8
write-questions-people-ask-each-heading = Pytania, które ludzie zadają, każde jako nagłówek z odpowiedzią pod spodem.
# en: 6d234a17fecd5048e790eb4d1c415e17899a0e56
write-press-release = Komunikat prasowy
# en: ba41d12bbba317bcacf230155abba7ce9e400379
write-news-in-first-line-detail = Wiadomość w pierwszym zdaniu, szczegóły, cytat, godziny i do kogo dzwonić.
# en: 0c30f8a886ae8207e0702b4daf5eda405b19a131
write-news-article = Artykuł prasowy
# en: 66280b179ec208e759c8fd7e05a4b1171c355c9f
write-headline-byline-story-in-two = Nagłówek, autor, tekst w dwóch kolumnach na papierze i wykres z liczbami.
# en: 19ad8ec7231e0cc9d9ea7e0684742672018e1f05
write-interview = Wywiad
# en: a8d0cc9ab05d2f4925e897a47c9c9554e289fb4e
write-introduction-then-questions-and-answers = Wstęp, potem pytania i odpowiedzi, przy każdej wypowiedzi imię rozmówcy.
# en: 94a18e60341a34b6feec02442ec2d70ee1244900
write-book-review = Recenzja książki
# en: a8ccbb45148f664a9800e533e32902524ce8217a
write-book-stars-what-it-is = Książka, gwiazdki, o czym jest, co się udało, a co nie.
# en: 1eb36cb79b31a29c161965efdbb310289b4e5814
write-music-review = Recenzja płyty
# en: 75857043416829c78af6afbfcd886ea90847e06c
write-album-label-and-length-stars = Album: wytwórnia i czas trwania, gwiazdki, utwory, najlepsze kawałki.
# en: fae48a8f67fd81fb5d54b5a9c2d60929cd5da2f7
write-thesis = Praca dyplomowa
# en: 8dd8017f140560c80229f7d051a8fb2376183e9a
write-title-page-abstract-chapters-with = Strona tytułowa, streszczenie, rozdziały z przypisami i tabelą oraz bibliografia, złożone jak książka.
# en: 42921f1b739a62eb82bc6f16ce47ff5ce5fd4da4
write-grant-proposal = Wniosek o dotację
# en: 381d823ac8ecdff832331120748c151a113b2464
write-ask-need-plan-budget-that = Prośba, potrzeba, plan, budżet, który się zgadza, i skąd będzie wiadomo, że zadziałało.
# en: 1b731d688386e2e229d1c2b671e96c2bfce768a4
write-syllabus = Sylabus
# en: fc9a91d648763f9cd04a596f372b833e76f709f8
write-course-when-and-where-what = Kurs: kiedy i gdzie, o czym jest, tygodnie i oceny, które sumują się do 100%.
# en: 3c847b9cd456626c998b9d2793f7701117ee4c80
write-formal-complaint = Formalna skarga
# en: f98daa2b60c626279045f82029a9e58dfcd90f4b
write-what-happened-in-order-what = Co się stało, po kolei; czego chcesz; i do kiedy, zanim pójdziesz dalej.
# en: f74c6bc075b1961f73f45729ce6281dc84fb3ccf
write-letter-to-politician = List do polityka
# en: 2e754026e13e7ebe41d9513e31f94d8268341243
write-ask-your-representative-for-vote = Poproś swojego przedstawiciela o poparcie: kim jesteś, dlaczego to ważne w Twojej okolicy, i pytanie.
# en: de21096f37522d15740e7a4acd69efc811f9b5ce
write-love-letter = List miłosny
# en: a6977a11c96b06575fd8359e1bb9e3dea5a21fcf
write-ordinary-things-missed-letter-across = Zwykłe rzeczy, za którymi się tęskni: list na odległość, szeryfowym krojem.
# en: 1af339528a1814a5f1dc409f2d108e0308035b87
write-wedding-speech = Przemowa weselna
# en: b040a94a7bd386ebaee15aa4c4535da004fadc4c
write-how-they-met-what-you = Jak się poznali, co się od tamtej pory wydarzyło, słowo do każdego z nich i toast.
# en: c88c994e6c6c50db17576753df90aac55138155f
write-eulogy = Mowa pogrzebowa
# en: cdc87e623e95678f786543dd272ba279df15e8ee
write-life-in-few-minutes-where = Życie w kilka minut: gdzie się zaczęło, kim była ta osoba, czego będzie brakować.
# en: 6c63ce6d4727a3fb46c16a62ac8d536b0b61fd08
write-zine-essay = Esej do zina
# en: ecce024c73aadb2150552b3419d5aa1c3cb72c17
write-personal-essay-for-small-magazine = Osobisty esej do małego magazynu, pisany na maszynie.
# en: 563a631aba8690962836c99d15886672eb96ef62
write-petition = Petycja
# en: 6d3ace089783eb6cf5e5fe47a7d74a3ee5c21f39
write-what-you-ask-why-and = O co prosisz, dlaczego i nazwiska osób, które się zgadzają.
# en: a6a1d25b018c9318540556e3fe374fdf8b23aff8
write-terms-of-service = Regulamin
# en: 79b220d914e24eb7ac79428e72639e8547d8ab9a
write-small-businesss-terms-in-plain = Regulamin małej firmy prostymi słowami: rezerwacje, ceny, klucze, sytuacje wyjątkowe, zakończenie.
# en: fe3b114dccf2739f949d65ac4101037eb8f92543
write-open-as-outline = Otwórz jako konspekt
# same
# en: de69a629f9c30af3f481110f0f42a7c0c5efacfb
write-a4 = A4
# same
# en: ee14050617b7b58e17aabccd61c241ccdafc6379
write-letter = Letter
# en: c036e85b63c6818f6732a2898cf85f30f8074bfb
write-name-this-column = Nazwij tę kolumnę

## Insert's dialog (kit/ui/insert-dialogs.ts): Tiny Little Office Doc

# en: d5674bb4dcb8c5fe378eb9cd0bb9d1849ed37581
insert-tiny-little-office-link = Link do Malutkiego Biureczka
# en: cdea71ff947c2b49dd7d7ea146fd3efeb9fa5677
insert-opening-short-link = Otwieranie krótkiego linku…
# en: 9d2d34c4b04d8410e0025beb7899a31d1bc57c04
insert-paste-link-of-another-tiny = Wklej link do innego dokumentu Malutkiego Biureczka, długi lub krótki: jego pierwsza strona pokaże się tutaj.
# en: 7e4861cdc8de2c0c4cf87ca37c9130a92051b5b0
insert-this-is-not-tiny-little = To nie jest link do Malutkiego Biureczka albo wygasł.
# en: 1eb05dc15f4e90a6a61c46b111812e974555cd81
insert-tiny-little-office-doc = Dokument Biureczka
# en: 7bb236efe4e244196e506d65542626cfe368bb09
common-tiny-little-office-doc-ellipsis = Dokument Biureczka…
# Insert ▾'s group of the apps a new document can be made in, inside this one.
# en: f9f93f3f14cfa3eea1bfcfee97ae22cd15b25e0d
common-new-document = Nowy dokument

## another document edited in place (kit/ui/doc-dialog.ts); a table's size is Rows × Columns

# en: 77dfd2135f4db726c47299bb55be26f7f4525a46
common-cancel = Anuluj
# en: 52d0b35277ee4b2b66ec4016620c658d99c7b57a
doc-rows = Wiersze

## charts (kit/draw/chart.ts)

# en: 7b6451ab3171ebc15cd43dfe0d80c1a0062c902e
chart-empty-chart = Pusty wykres
# en: ad5fb3b6084bf40286ee5437a7f894e0088a499d
chart-bars = Słupki
# en: eb911036281c4d6d5c0b067a7951e39b0aca7b63
chart-flows-sankey = Przepływy (Sankey)
# en: ecbdb15a7119ffa05cdc38ee38e20c129e28a8bc
chart-flows-list = Przepływy: { $list }.
# en: c6fd3870c86e7422a0146e1e2a052437fb8e51e2
common-lines = Linie
# en: 5a2f5ac996eef952d239a22e8d68296faf975994
chart-nothing-to-chart-yet = Brak danych do wykresu
# en: 7631740b7c7b5a09ad168ae28580b5c9ca4b8c06
chart-nothing-to-chart-yet-rows = Brak danych do wykresu: wiersze Od | Do | Kwota
# en: 9318d4f63aeffddc47d4520c722ad70f0ec6c63a
chart-pie = Kołowy
# en: 40c20d94e78fa142819df8cc9440d30e65329975
chart-series = Serie
# en: 79b2c4ce6295c191bf1031160055f59fb8174174
chart-kind-chart-data = Wykres ({ $kind }). { $data }

## the Spreadsheet

# en: 12acc4f41c4ad8ed5996ac33a2f066e024ba1c65
sheet-clear-these-cells = Wyczyść komórki
# en: c527ea0aeba3f2d0104802279fed7e595157b78e
sheet-fit-this-column-to-its = Dopasuj kolumnę do tekstu
# en: b92fe41ac34453cd0368f0fa5d00d1e9b0279c12
sheet-cells-in-hand = Zaznaczone komórki
# en: 119faf17cd1de268ce34ade4f9bae4520774f640
sheet-check-ref = Zaznacz { $ref }
# The column type that holds words as typed.
# en: c3328c39b0e29f78e9ff45db674248b1d245887d
common-text = Tekst
# en: cc6fdf1b0963eceb567d2f5b641f4950751636eb
common-spreadsheet = Arkusz kalkulacyjny
# en: 469342764c059045df7b47882a77d96ceb261898
sheet-spreadsheet-lowercase = arkusz
# en: 7e53821f70ae16079c4a6a64c52a91fae645bc5f
common-numbers = Liczby
# en: 05634091c29d83162cee95ca003dc222a3bab8ea
sheet-spreadsheet-with-formulas-named-cells = Arkusz z formułami, nazwanymi komórkami i wykresami; na start trzy kolumny, więcej w miarę potrzeb.
# en: 7aeba4cd15b1afc5015285c0854f0edae2380d36
sheet-budget = Budżet
# en: d99860b75cc866415325dd845f03e65f1b9fc648
sheet-planned-against-actual-line-each = Plan a wykonanie, pozycja w wierszu, z różnicą i sumami.
# en: 0a0a7c3be7656f55cd259d558c2d0eb59b893b88
sheet-expense-log = Dziennik wydatków
# en: c2effbb05c6382e67befb796de9be3ad264a1cbb
sheet-date-what-how-much-which = Data, na co, ile, jakiego rodzaju; suma bieżąca na dole.
# en: a2d841e763d975477b0e1a51d15e6f25c9023d4a
sheet-training-log = Dziennik treningów
# en: d5b29b7fbac7da4d79a420a8108f0c98bb1ab61a
sheet-what-you-did-and-how = Co zrobione i ile, wiersz po wierszu; suma dla każdego rodzaju.
# en: 4d89a20e90ff128c4329c067414e272156b4b196
sheet-project-tracker = Śledzenie projektu
# en: a9f287fb1ede11b35e739a207cac5eddcfd2116d
sheet-tasks-with-owners-start-and = Zadania z właścicielami, daty startu i terminy liczone od dziś, dni na każde, jak idzie i ptaszek po wykonaniu.
# en: 83c8cb0557f1a8ab76094b2801ae0b4cd23e4741
sheet-loans-compared = Porównanie pożyczek
# en: 8ae3fb1476eab673ec96c9e2614cad18cbd6f497
sheet-amount-rate-and-years-for = Kwota, oprocentowanie i lata dla każdej pożyczki; rata miesięczna (PMT), ile kosztuje w sumie i odsetki.
# en: 53f4e4eb1a489c6a14658993062fc985a80bd775
sheet-subscription-business = Biznes subskrypcyjny
# en: f14ffb32b12ec6d73e3971054ddf5248de50852a
sheet-visitors-who-sign-up-pay = Odwiedzający, którzy się zapisują, płacą i zostają: model jako przepływy, z założeniami obok do zmiany.
# en: 2f6636a8892aa5d7f9781b630c2131dc8652a7f1
sheet-cafe = Kawiarnia
# en: ce157b2ac144f603ec936234eb69d9d524c3354f
sheet-customers-day-what-they-spend = Klienci dziennie, ile wydają i dokąd idą wpływy miesiąca: zaopatrzenie, czynsz, pensje, zysk.
# en: 27f8244e11467491805da5dcaace666e1176df07
sheet-freelancer = Freelancer
# en: c7da5aec39e9bdd23c061f2f34a9ecb65f9f20a2
sheet-hours-rate-and-weeks-make = Godziny, stawka i tygodnie dają faktury za rok; po odjęciu wydatków i podatku zostaje kwota na rękę.
# en: 53ca3d56131df7985cdd58b24a369278bce0d723
sheet-mutual-aid-fund = Fundusz wzajemnej pomocy
# en: 4df80f44a8c21f77f84393546555c9ab3224fe85
sheet-monthly-donors-and-one-off = Comiesięczni darczyńcy i jednorazowe datki zasilają fundusz; z niego idą dotacje, trochę administracji i rezerwa.
# en: 992dbb972d7850082f91f3f43d7b68391091a32e
sheet-month-by-month-with-chart = Miesiąc po miesiącu, z wykresem
# en: 876c69fa93189c4e89f57aeec964d0573e61be81
sheet-this-year-against-last-line = Ten rok na tle zeszłego, wiersz na miesiąc, jako wykres liniowy.
# en: 467dda8775e7e01a3dacd9ff5d247da7caf931d3
sheet-household-budget-by-month = Budżet domowy miesiąc po miesiącu
# en: f61119c5b20c1ed2360f6aa2b583872a1fc9c474
sheet-six-months-of-homes-bills = Sześć miesięcy rachunków i wydatków domu, kolumna na miesiąc, zsumowane w obie strony na tle pensji.
# en: 2c2609efcdcac42f94b3d73758d40d3f2f79dfd8
sheet-savings-goal = Cel oszczędnościowy
# en: 49ff61e9d2d6e99106df2e02e7a626aa5186c112
sheet-what-went-in-each-month = Co wpłynęło w każdym miesiącu, ile już odłożono i ile zostało, a obok cel do zmiany.
# en: ca1ec97c50f7647ef3588d5de58af33939c01646
sheet-habit-tracker = Śledzenie nawyków
# en: 7a2638dee7c38146953a64566dbd8fc8ea77d8d4
sheet-four-habits-checked-off-day = Cztery nawyki odhaczane dzień po dniu przez dwa tygodnie; jaka część każdego dnia się udała i ile dni każdy nawyk.
# en: d80f6ec7eac0c80248e2c7b452e21f89673449f2
sheet-reading-list = Lista lektur
# en: c809293d68f1061cf7062072d2efc8fe95fe9262
sheet-books-read-being-read-and = Książki przeczytane, czytane i następne, z liczbą dni na każdą i stronami przeczytanymi w tym roku.
# en: 6e14850d9abea09c879f881a4773537f91cf2ac2
sheet-workout-log = Dziennik ćwiczeń
# en: b2a1db48bce10aa5ac4b8eb894555098ecbaac30
sheet-sets-reps-and-weight-for = Serie, powtórzenia i ciężar przy każdym ćwiczeniu, policzona objętość i jak każde poszło.
# en: 5be9810c81e208adc153f7aa0cc70f64c988d737
sheet-time-sheet = Ewidencja czasu pracy
# en: df9c77cdd1cdf96f00633ef7f822543a7185dbc6
sheet-weeks-hours-by-client-and = Godziny tygodnia według klienta i zadania; płatne wycenione według stawki, i sumy.
# en: da7a3e11a9c1686127720177adfd2bbfed7224e0
sheet-trip-costs-split = Podział kosztów wyjazdu
# en: bcc455f94ab37c41dad441a4152ac7961c3118ad
sheet-who-paid-for-what-on = Kto za co zapłacił na wyjeździe we czterech; uczciwa część każdego i ile kto jest winien (minus to zwrot pieniędzy).
# en: 3fcd3bd6c3c0517dc23b7c9c8a424a6ba7c30c9a
sheet-schedule-with-dates = Harmonogram z datami
# en: 9cfdf52e38ee970ebd6feac438c7d2cb6abd25c5
sheet-job-in-steps-each-starting = Praca w krokach, każdy zaczyna się, gdy kończy się poprzedni: kto, ile dni, data końca i dni robocze.
# en: 2a3b772f6e347425b5a235a2e956004ed5177213
sheet-grade-book = Dziennik ocen
# en: 0e6fce40b16529c27d306da8834f33a391a5ca5b
sheet-classs-grades-for-essays-quizzes = Oceny klasy za wypracowania, kartkówki i projekt; średnia i ocena każdego ucznia oraz średnia klasy.
# en: 7d9ac107a69e997e571bd6906b535f6802bc5569
sheet-membership-roll = Lista członków
# en: 3bc0a32ca3d296ee9217f44adf3cf4d3c3dbd080
sheet-who-belongs-their-plot-and = Kto należy, ich działka i zadanie, kiedy zapłacili i kiedy odnawiają, kto ma klucz i wpłacone składki.
# en: b884fda377a19ce445f8ec49bd90f2784834978c
sheet-seating-count = Liczba miejsc
# en: 4e00db4efd970061e8ff6cd63f723c7385ad1637
sheet-tables-for-wedding-seats-guests = Stoły na wesele: miejsca, goście, wolne miejsca i wybrane dania, ze sprawdzeniem, czy dania się zgadzają.
# en: 8a535a1def73648a0a55a9bfa21c9d370e434ce5
sheet-poll-results = Wyniki ankiety
# en: df60ac32ce5b04bf11e53f97d296db53c2a2cda2
sheet-answers-and-votes-for-each = Odpowiedzi i głosy na każdą, narysowane nad nimi jako wykres kołowy.
# en: bfee938677dd9bf5dab2de4f9558c07a06d616fd
sheet-fundraising-thermometer = Termometr zbiórki
# en: f6873b16e788104f3e409c1c06243db77d2a6e04
sheet-what-has-come-in-week = Co wpłynęło, tydzień po tygodniu, na tle celu: wykres u góry i dotychczasowa suma dużymi cyframi.
# en: 20ded69e290360ef0be6b1fd22e648ca398d7ed3
sheet-invoice-ledger = Rejestr faktur
# en: 2404f6c1a633f188d6395d7b35f7dd1486c597b6
sheet-every-invoice-sent-when-to = Każda wysłana faktura: kiedy, do kogo, na ile, kiedy zapłacona, ile jeszcze należne i z jakim opóźnieniem.
# en: 300d29fd5f327e8c7a0f4614d4125d93570eeeff
sheet-inventory = Stan magazynu
# en: cca3ceb6d79e8c2e922aa21c8675223c1b96c275
sheet-stock-on-hand-against-point = Zapas na stanie w porównaniu z progiem zamówienia; co zamówić, ile to warte i flaga, gdy jest mało.
# en: ba8d2875e56e1ee2a745057f4de807182be4bb9b
sheet-petty-cash = Kasa podręczna
# en: 8c7a0a9d0703152466c522d2d8bbd55cfcea218d
sheet-money-in-and-out-of = Pieniądze wpływające do kasetki i z niej wypływające, kto je wydał i na co, saldo po każdej pozycji i ptaszek przy paragonie.
# en: dca1686c53daf52f46495f2a961a3346006e41ac
sheet-rate-card = Cennik
# en: 1a3c8694038b9c6d56a26e131d62c3616e165a77
sheet-freelancers-services-with-hours-each = Usługi freelancera z godzinami na każdą; ceny i ceny ekspresowe wyliczone z jednej stawki godzinowej.
# en: b9d1a465f75615e0b55ff620ec057c608971b8ed
sheet-mortgages-compared = Porównanie kredytów hipotecznych
# en: 43ecdf4a244c2e1c022c6c08a3ba1c07f107ece3
sheet-four-offers-on-one-house = Cztery oferty na jeden dom: kredyt po wpłacie własnej, rata miesięczna, w sumie z podatkiem i odsetki.
# en: 54695e5df6ef00663252186d998a600f9bac4c58
sheet-unit-converter = Przelicznik jednostek
# en: d2e0c086c77046805d1cc8934044bb315bf00aec
sheet-miles-and-kilometers-pounds-and = Mile i kilometry, funty i kilogramy, piekarniki, szklanki i galony: wpisz ilość, odczytaj drugą jednostkę.
# en: 9d2911edf283fc08872808d554a1017460fbe86f
sheet-tournament-bracket = Drabinka turniejowa
# en: ad907a82b59f9d64761c80d6b2fe13c2a3b04fc2
sheet-eight-teams-single-elimination-each = Osiem drużyn, system pucharowy: wynik każdego meczu, policzony zwycięzca i zwycięzcy przechodzący dalej aż do finału.
# same
# en: 0e2d6a433d926deb1903e03f166c76cd50bd542d
sheet-excel-xlsx = Excel (XLSX)
# same
# en: 3281188351b89c8e2db28d6da7af4992d415de90
common-csv = CSV
# en: 795a4ad3f904388d715a0384382b361f16342610
sheet-chart-svg = Wykres (SVG)
# en: 3001366084e5b141572a5a7b708f24fc835d2720
sheet-chart-png = Wykres (PNG)
# en: 492630372c601d63c25590ebdc75ab6f34a2ff74
sheet-empty-sheet = Pusty arkusz
# en: 2decd02b722b692c9d30d7de5e0c1191d1968de7
sheet-n-of-max-shown = (pokazano { $n } z { $max })
# en: 9e85be5a97dd107512bd06368b695b4265a662c9
sheet-50-more-rows = Jeszcze 50 wierszy
# en: 46dd847f36799647b69659ed71327486c70728ea
common-add-column = Dodaj kolumnę
# en: dff758e7f1104295adde7af1bb92396f6c7c88a7
common-add-column-after = Dodaj kolumnę po
# en: 66c7734789e19cbeef3a5ac185ea732139aed213
sheet-chart = Wykres
# en: a0e276f06261f873cb144d086a0f3c33941f43f7
sheet-chart-of-table = Wykres z tabeli
# en: 1d66c3d0758e71b315e012814dc35df62cfab9d2
sheet-checkbox = Pole wyboru
# en: 3c5512cb6f54f5f5483d681781a71d95982c8769
sheet-column-after = Kolumna po
# en: 6d36997d9f52785865f243c2436502c328d12b1f
common-column-c = Kolumna { $c }
# en: b4a57f5f40871854cb181f17a04c4e72c5c4048a
common-column-c-holds = Typ kolumny { $c }
# en: b657e2a4e550834ea13d1026bf21694fb9a65c3c
sheet-column-c-type-what-it = Kolumna { $c }: { $type }. Typ, sortowanie, dodaj lub usuń
# en: cf723c59b62a173547c39c3d661c4ee7c240bab1
common-columns = Kolumny
# en: 40c14f884fe7e5b4e58ea4bd6f6d522bae43134b
common-delete-which = Usuń: { $which }
# en: 51f5ba33dabbc2c8aa4e3e640e0b27cb55aea1be
common-drag-to-fill = Przeciągnij, by wypełnić
# en: 87b8f44339c3a345782b1fa838bfa3b0406567b3
sheet-abc-or-123-for-this = Typ kolumny
# en: 69ff8ba19299f697ed3f5401bb7c03f0abbc4c67
sheet-drag-to-resize-double-click = Przeciągnij, by zmienić rozmiar, kliknij dwukrotnie, by dopasować
# en: 363a9922cf56c76397d7b72ae8425d30d0438b33
sheet-fill-down-from-top-row = Wypełnij w dół od górnego wiersza
# en: 549a401f55bc461388a4f5f8554db5e0749d0a28
sheet-fill-right-from-first-column = Wypełnij w prawo od pierwszej kolumny
# en: 51f5ba33dabbc2c8aa4e3e640e0b27cb55aea1be
common-fill-drag-to-carry-these = Przeciągnij, by wypełnić
# en: 4425eb9442fea0435d290b7a34f1ad8a6980e789
sheet-fit-columns-to-page = Dopasuj kolumny do strony
# en: 720f58fb1f9353ab3c904b888ccb774c40393e06
sheet-formula = Formuła
# en: f1e410ad1472b42cb42cc98962428637290b6706
sheet-function = Funkcja
# en: 4c0ab96e8dd44e528589261be865f136fcbae564
sheet-high-to-low = Od największych
# en: 22c03da74b04607929f25258870ac2571a1b46bf
common-insert-n-rows-above = Wstaw { $n ->
        [one] wiersz
        [few] { $n } wiersze
        [many] { $n } wierszy
       *[other] { $n } wiersza
    } wyżej
# en: 5e3141f35e5d110b9f6303876cf866971f689046
common-insert-n-rows-below = Wstaw { $n ->
        [one] wiersz
        [few] { $n } wiersze
        [many] { $n } wierszy
       *[other] { $n } wiersza
    } niżej
# en: ae3b3fa65ff4f34adbaf5d76e694293bb2059fbf
sheet-letters-keyboard = Klawiatura literowa
# en: 7177342b32d961e7d51feb4571231982a48a0772
sheet-lock-these-cells-so-reader = Zablokuj te komórki, żeby czytelnicy nie mogli ich zmienić
# en: 893190219ca26f4bad6f2395b91da6295cab23b6
sheet-locked-part-of-model = Zablokowane: część formuł modelu
# en: b1b588e8ffba9c37d560f4b4d63c6344d009ce2e
sheet-low-to-high = Od najmniejszych
# en: 1dc043bb8eb5646851ff808477bb5d3573739f1c
sheet-money = Pieniądze
# en: 709a23220f2c3d64d1e1d6d18c4d5280f8d82fca
common-name = Nazwa
# en: 3f37ebdc04c6216818bd5bbf8724175546a880c8
common-name-of-column-c = Nazwa kolumny { $c }
# en: c103a2458adcf85547000188a915ccb91f45ee9c
sheet-names-cell-to-its-right = Nazwa komórki po prawej
# A money column's currency (Money picked in a column's menu): the field's hint, and what it says of words it cannot read.
# en: d02550533b8780a7e646803c3b7b9cb7a78ba756
sheet-symbol-like-or-code-like = Symbol, np. $, albo kod, np. USD. Puste oznacza walutę dokumentu.
# en: 1224b5538c873fc11d856120fedeb76e516529c6
sheet-symbol-of-up-to-three = Symbol do trzech znaków albo kod z trzech liter.
# en: 630470a61228c20119f270074f1e0b6a4c2d9151
sheet-no-chart = Bez wykresu
# en: b7baa1d40c4ea29afc9098732bffee2a861a6c44
sheet-number = Liczba
# en: 80838be5576c4b333f764e352ef9e6c5292b2b78
sheet-open-link = Otwórz { $link }
# en: 1d6f3ce763f138e0025747a9d3ae7f30efc75531
sheet-opens-when-clicked = Otwiera się po kliknięciu
# en: ac556cf5938d2104533c38103305f6cf60ba245d
sheet-percent = Procent
# en: 4f9fa8ea1af8cde7cca877c50ca723eeadee35dc
common-remove-this-column = Usuń tę kolumnę
# en: 12ee6fe44798c4fe94090bef612f25e903d9cd15
sheet-resize-column-c = Zmień rozmiar kolumny { $c }
# en: fa84cb8f7793313625378f4a9caa43b1abbf650b
sheet-rich-text = Tekst sformatowany
# en: 45c89f220501dfd15e267bf7d636dc7a76526971
sheet-row-above = Wiersz wyżej
# en: 9be9bf4f94705d404df5c715fda96ae93fda7494
sheet-row-below = Wiersz niżej
# en: 95d5eb6f6a50994282979432eb3c4dc5836db2e2
common-row-n = Wiersz { $n }
# en: 7d69f57d4baecc18e3e40be8d939c9d2cbc2e2f1
common-row-n-lowercase = wiersz { $n }
# en: 8fcfbe7f09950cb9105bd4280c43ee2524090dcf
common-row-n-insert-or-delete = Wiersz { $n }: wstaw lub usuń wiersze
# en: 767a59f7f0079a019b266853b864269f92d10d82
common-rows-b = wiersze { $a }–{ $b }
# en: b92fe41ac34453cd0368f0fa5d00d1e9b0279c12
sheet-selected-cells = Zaznaczone komórki
# en: 26b30f90bad8aab892824738a0dc60bd11d082be
sheet-show-all-text = Pokaż cały tekst
# en: 9580fcbce0c31ceaa47eb583e5f7ce637fdc8a0a
sheet-shown-as-typed = Zwykły tekst
# en: a2a5bdeca9391be1e0cdff1c19895bae7fadc2c2
sheet-sort-rows-by-it = Sortuj według
# en: ff87bd67a9f3709f0a4247baa8ba4de4a5bd5fd2
sheet-suggested = sugerowane
# en: eda0b8f3c389658a7369166fd4c36099e380adff
sheet-is-as-wide-as-it = Arkusz ma już maksymalnie 26 kolumn.
# en: 0f54b98f336606a21f0bcbdc77afa4474b2b1966
sheet-is-full-its-last-rows = Nie można dodać wierszy: ostatnie wiersze nie są puste.
# same
# en: 7a74dff615ee3bcbc90d8c31886f01082413c776
sheet-three-at-least = Minimum 3
# en: c97ecbf8fed8c8a3a0d51412e2e9bd4c8539ba26
sheet-unlock-these-cells = Odblokuj te komórki
# en: 7e592be640ccac5b2bdf24df5b74d19326b5094a
sheet-what-it-holds-sort-columns = Typ, sortowanie, kolumny
# The Spreadsheet: any column removed, the Option column, rich cells, a chart put in from Insert.
# en: 63362bbc585e9e03cbf63abe945bcf99aa4d8cc5
sheet-keeps-one-column = Arkusz musi mieć co najmniej jedną kolumnę
# en: 7208e66f41dd004e736a1840e2a99d288a4c2060
sheet-choices = Opcje
# en: 38b6d89278519f90efb25eb841096bc63d9095e0
sheet-choices-for-ref = Opcje dla { $ref }
# en: a871e2c9206cb4854cc06c30bc6de95cb82f9700
sheet-has-one = Arkusz ma już wykres
# en: f0dfb92a1f16391ab3bd5478ce9d8c0f2d74bf95
sheet-edit-cell-caret-at-its = Edytuj komórkę z kursorem na końcu
# en: 28d1a54d2e35ad87c0d19942f68d70ddbf67bcee
sheet-put-back-what-cell-held = Przywróć wartość komórki
# en: 2b69414b3787eaa8a38f2f1a9c4a48aff7dd78a5
sheet-put-dated-rows-on-calendar = Umieść wiersze z datami w kalendarzu

## downloads: hand-offs to another app (kit/file/exports.ts)

# en: f03b6f674b16abfbc970946d0781228b3407655e
export-open-in = Otwórz w
# en: 7f7b61c3d0574fa0bae27972834652c8b6f222e6
export-pdf-file = Plik PDF
# en: 20ab05206208a4e9bea088d36c6640c781c6bf65
export-copy-link-that-downloads-ext = Skopiuj link, który pobiera plik .{ $ext }
# en: 389a8e30f70f547f507d418d67a8048c7eb2eda4
export-could-not-share-ext = Nie udało się udostępnić pliku .{ $ext }
# en: 5869a7d435c371c52a7c02fe623f625c5062ba1c
export-could-not-show-ext = Nie udało się pokazać pliku .{ $ext }
# en: b31bab5111d8c6e8c5b51deffa133f4e7063ec37
export-download-ext = Pobierz plik .{ $ext }
# en: 6d92cb44456263f51e52b62171b3602b54c5fec0
export-share-ext = Udostępnij plik .{ $ext }…
# en: f9b579ae7d7104f25e1800d18a5b3e89343618cb
export-view-ext = Zobacz plik .{ $ext }

## the icon library (kit/ui/icons-picker.ts)

# en: 716f63b96e0c263222949a3b8a00cdb4f46d3183
common-icon = Ikona
# en: 07b3e447db02b7cc20a78a57c316febae22ed72b
icons-favorites = Ulubione
# en: a8b63bb6a000ce6560e6126bf0fade0a56fef128
icons-search-icons = Szukaj ikon
# en: 7fcd8d44c6f295423534073543e6050ddd8cf497
icons-suggested = Sugerowane
# en: edb8f6c14252759cd8673c61a24376d32e17b93a
common-icons = Ikony
# en: 7d9b3876b6aa451cf6a99a0323e97ba79d6a4a27
icons-no-icons-match-q = Żadna ikona nie pasuje do „{ $q }”.
# en: 213898967018ae7e0c3b4bf96e59877f9d434ca7
icons-search-by-name-or-by = Szukaj po nazwie albo znaczeniu („pieniądze”, „pogoda”, „ai”), by znaleźć jedną z { $n } ikon.
# en: 95553ba8a4056a6f9817d2dbbf0be4c66d9eacd7
icons-no-icon = Bez ikony
# en: 1935c7dc9183bd8f7d4987f70ff5592b29d45397
common-icon-or-emoji = Ikona lub emoji
# en: b37554f695b15005fd23907b9488e0a8ad4bca5f
common-people = Osoby
# en: 1699cec34f8ca2d63e0b366fc1fe83d5de3a0c13
icons-search-icons-and-emoji = Szukaj ikon i emoji
# en: da588993ff27cbb60e3c1cecefb192d389748ef0
icons-or-emoji = Ikony lub emoji
# same
# en: 5090a9e78c899272a10648b39e7689bc40072825
icons-emoji = Emoji
# en: d30201283cf13108c4beeb8c7c1787e5cda37590
icons-no-icons-or-emoji-match = Żadna ikona ani emoji nie pasuje do „{ $q }”.
# Unicode's emoji groups, as the picker's Emoji set names them.
# en: d883a36d4ea749e2946b208450185bccfbca11c2
icons-smileys-emotion = Uśmiechy i emocje
# en: 45f4db9fab3599be7af02e3a58af52988789725d
icons-people-body = Ludzie i ciało
# en: fee7d0c1beea3c67c9a835315496da822a22e839
icons-animals-nature = Zwierzęta i przyroda
# en: a9704a2ad9afea5f9d4d1504458f91e253557264
icons-food-drink = Jedzenie i picie
# en: 4cea7e0a28a73fafbe052e8132f1c86cd07a68ed
icons-travel-places = Podróże i miejsca
# en: e58f7f889902c81b8879128fede278022f0e459c
icons-activities = Aktywności
# en: 72a83add2c5ede877c10d23f302d3e17accbadab
icons-objects = Przedmioty
# en: 22ad664e9eb98b75a73333b2b2395fc4b52e6fc9
icons-symbols = Symbole
# en: 5d728758adcdd5154d3be55552c1c061ef1489b2
icons-flags = Flagi

## the Drawing Tool

# The group heading the Drawing Tool sits under on the home page: Design. 'Draw' is the Animator's mode for drawing.
# en: bfa50c7a3838fc883b8f4fd701b280e77a3952ea
draw-draw = Rysuj
# en: 51c99e5a9ce98b2b6990b55b10a46d2fd23a18f1
common-drawing-tool = Rysunek
# en: f4f99578c04e974810cdd12ceb7ae902de7291d3
draw-drawing = rysunek
# en: 59b035367211a9382930b2a4c13637dbc33c4f32
common-design = Projektowanie
# en: 0077c4c9a2bcb4318b7a85a034bc75912afc3cb5
draw-boxes-arrows-icons-and-labels = Pola, strzałki, ikony i etykiety na siatce; albo pixel art, który może stać się kafelkiem tła.
# en: b807ee7758852c19e577610f2c56bf3ee0fb29bb
draw-request-flow = Przepływ żądania
# en: 00cbc89498c2f280038a754777730896717e8071
draw-browser-asks-server-which-reads = Przeglądarka pyta serwer, który czyta dane: pola połączone strzałkami.
# en: 0b2cbbcb4742328b0a7288f1b69223de737b2d15
draw-flowchart = Schemat blokowy
# en: f7a7e4b122a1c6db709d59b923a8e915ae67c9b3
draw-three-tiers = Trzy warstwy
# en: 8d884dc3538d977a76ea897e377b897d4b3cdc0c
draw-phone-and-laptop-api-database = Telefon i laptop, API, baza danych i pamięć podręczna: system narysowany ikonami i połączeniami.
# en: d5786d3d397a91b189e23529401c4f8d35cd09b0
draw-floor-plan = Plan mieszkania
# en: fddd68346c75bb66ad003c667e573feb965f7ca4
draw-one-bedroom-apartment-from-above = Mieszkanie z jedną sypialnią z góry: pokoje jako prostokąty, opisane, drzwi jako przerwy.
# en: 38a0d171dc9e21d8e32aacfbb8a170dad9977d9c
draw-pixel-heart = Serce z pikseli
# en: 7f51a7b112b9965b1cf5d78f9b43f76de5ad8f0d
draw-16-by-16-heart-in = Serce 16 na 16 pikseli, do pokolorowania albo jako punkt wyjścia.
# en: c65ee0720b3ba1dac7268415c7c987faabecc4a8
draw-background-tile = Kafelek tła
# en: e78fb3ca7b230e0df30391c85eec105bf55656bd
draw-8-by-8-pattern-that = Wzór 8 na 8, który się powtarza: użyj go jako tła rysunku albo dowolnej strony.
# en: 99cb45a6f4e975a5a7be78811422b5933dd6598b
draw-card-for-ninetieth-tilted-on = Kartka na dziewięćdziesiąte urodziny, przechylona na tle konfetti: duże słowa, kwiaty, serdeczności od wszystkich.
# en: 2020c98a00da0ecd8574350e226b7d4c448a451f
draw-phone-screen-sketched-in-boxes = Ekran telefonu naszkicowany w polach, zanim ktoś go zbuduje, z notatkami, po co jest każda część.
# en: 106c289912d69f2f02f64b1c195daa945a29c19f
draw-rosette-with-ribbons-for-volunteer = Rozeta ze wstążkami dla wolontariusza roku, do wydruku, wycięcia i przypięcia.
# en: c9c7469b74c0a43646cb4a46279d9930b271ca19
draw-block-party-from-above-stage = Uliczny festyn z góry: scena, stragany, pierwsza pomoc i miejsce spotkania, gdy ktoś się zgubi.
# en: 6d12c8adbefeaeacac0d48274df3a195ca9a1d17
draw-badge = Odznaka
# en: 32787c0201e95e7dd6ca00aa5dd63210e278e3db
common-birthday-card = Kartka urodzinowa
# en: be3883124104a86065f65c46fcf4edff20e0842f
draw-can-we-refund-it-stores = Czy możemy zwrócić pieniądze? Zasady zwrotów w sklepie jako pytania, odpowiedzi i co robić.
# en: 619a6e052e5343b8fbad2bfbc5a35d0aa4ec763f
draw-event-map = Mapa wydarzenia
# en: 6349ac251c1b86c4744c7e0361a5e72ea5e38402
draw-four-16-by-16-icons = Cztery ikony 16 na 16 na jednej siatce: słońce, chmura, deszcz i burza, do skopiowania do prognozy lub przycisku.
# en: 9c6396f6f0d3ea9cb4720d61fecd3ede243d72c8
draw-game-sprite = Sprite z gry
# en: 8752fbad4e546cb5ffe343544f280f98fc20d43f
draw-logo-sketch = Szkic logo
# en: 26dbc52edd1d138f4ab006d860b56dee54bf919f
draw-order-to-doorstep = Od zamówienia do drzwi
# en: 9bdb2a0b447519986c24ccc21eaf68976587c9fc
draw-pip-frog-32-by-32 = Żaba Pip, bohater 32 na 32 w czerwonym szaliku, z konturem, gotowy do animacji.
# en: d8cca3dd62ad1e4c37a8b10c054464bbcb13e3c9
draw-room-plan = Plan pokoju
# en: fcba7b3fe14a456c5dd428b4e0b28552efa25751
draw-living-room-rearranged-sofa-rug = Pokój dzienny po przemeblowaniu: sofa, dywan, regał i biurko w skali, z narysowanym otwieraniem drzwi.
# en: 8640aa92343372c68f5d72660821c342598d8b38
draw-three-ideas-for-coffee-roasters = Trzy pomysły na znak palarni kawy obok siebie, nazwa duża i data, do której wybrać.
# en: 68224d905ee1bc5c63082121b1e80cf6fe7d08c1
draw-weather-icons = Ikony pogody
# en: 0d07d8bcde49fe88082ab75f75e2fd49bbcef253
draw-what-happens-to-package-from = Co się dzieje z paczką od chwili zakupu: proces w krokach, z ikonami i połączeniami.
# same
# en: a5be156d0e860e683861363db9d3c32c664ca943
draw-wireframe = Wireframe
# en: 3e8785ece820edb3b53646af4cc1d4e3d40e13cb
common-picture-svg = Obraz (SVG)
# en: 833ba107dc3d58db8b9f35a717d7bd43c83a0817
draw-background-tile-svg = Kafelek tła (SVG)
# en: 34f2e94dc9cb747e7afc204c645943fa3ab68196
draw-background-tile-png = Kafelek tła (PNG)
# en: 75f5b48c5980dd2997738dd7416aa5fe8ca60e9a
draw-animate-this-drawing = Animuj ten rysunek
# en: a42ec2578a2a55cc28dcfbd53e3c34dee5d31d78
draw-drawing-of-things = Rysunek: { $things }.
# en: 2759692cb0d64c0c370b6516074bb1de744a31a2
draw-drawing-of-n-unlabeled-shapes = Rysunek: { $n ->
        [one] { $n } kształt bez etykiety
        [few] { $n } kształty bez etykiet
        [many] { $n } kształtów bez etykiet
       *[other] { $n } kształtu bez etykiety
    }.
# en: f33cdbb01b5b65fe3fe8928669d13ca09b3b5403
draw-leads-to-b = { $a } prowadzi do { $b }
# en: b9e37b62382792094f5463a54183d523118a25a0
draw-joins-b = { $a } łączy się z { $b }
# en: e0883468badf6a5f9c1cfe0ce209a16939a64683
draw-empty-drawing = Pusty rysunek
# en: 1f9c4a5ed21a39ed45db86eb13cbff389eede2cf
draw-pixel-art-n-by-n-filled-squares-filled = Pixel art { $n } na { $n }: { $filled ->
        [one] { $filled } pole zamalowane
        [few] { $filled } pola zamalowane
        [many] { $filled } pól zamalowanych
       *[other] { $filled } pola zamalowanego
    }.
# en: 2aafc8e9796ba5ac5ccffa1800cf6c5ba65250fb
draw-pixel-art-n-by-n = Pixel art { $n } na { $n }
# en: 8598222918d3c6e513d63060cf55e2971ded729a
draw-select = Zaznacz
# en: c158695a64adb40952c1cf9fde78b62bd6147f42
draw-rectangle = Prostokąt
# en: 8580e3175f4eb7461a5fac359ee86cd4c559d555
draw-ellipse = Elipsa
# en: b3850e04b5cc10929206d2336efa79a041358d57
draw-diamond = Romb
# en: ea9676003762818513c636984faeaa0ae356839a
draw-line = Linia
# en: 3a4758c3cc8dac2d76026d0733816741f9b21d43
draw-arrow = Strzałka
# en: 24421a551f456e8f5bde7180378b590f0337c041
draw-join-two-shapes = Połącz dwa kształty
# en: cf6c07e7054fad4d6a8affaf62f285e16525c46e
draw-pen = Pióro
# en: c72e323a57434ede3b6eb0cc235109eb76833c55
draw-any-shape-tap-for-each = Wielokąt: stuknij każdy róg
# en: 016a5405a0b425e7d1ac65317df59b45ce5fb1f5
draw-freehand = Odręcznie
# en: 8a48ec1f6c073fad0326a0e9251a18e4c88660b5
draw-drag-to-draw-line-or = Przeciągnij, by narysować linię lub kształt
# en: dcd096d38fc0be24bd96ac76246e98341b853208
draw-rounded-box = Zaokrąglone pole
# en: 08596d60c57fd87e530cbdd2a06052b06d8c4137
draw-hexagon = Sześciokąt
# en: b116d77a368034d3de6ca1dc0414de7dfd49400b
draw-parallelogram = Równoległobok
# en: 817b354dc01a34895eab0c37e21af38dc0850d08
draw-cylinder = Walec
# en: 2c924e3088204ee77ba681f72be3444357932fca
common-note = Notatka
# en: b406fb57b29fc76f71864fbb37f0238045f84d9d
common-black = Czarny
# en: cc9db3a795571c7e71f45670a1da7ff49b5f1557
common-red = Czerwony
# en: 09fb6aaba7940a7b7ffdbc9cbb9b3498303c1bad
common-orange = Pomarańczowy
# en: 933bf21afdd55a0d2283845fed0e7bbdd1f5db49
common-green = Zielony
# en: 7d44bc449c2a26374800a503f10f3d8949505f40
common-blue = Niebieski
# en: 32576f4fedc07f63020353af6a8aac66c4452c4c
common-purple = Fioletowy
# en: 3b4e294693563cc45de95b9db8b4abeabfac77db
common-indigo = Indygo
# en: 3526f607bcd4f51ad0bc05f814579a42c2c0ba57
common-yellow = Żółty
# en: b3d97fd6dece388a968e367f3ac4b9e64d739f52
draw-sky = Błękitny
# en: 54076359fdc7f1f0e000b9ae15b96f8b09866acb
draw-pink = Różowy
# en: 168cbb2ea52b9e34d271accecfa7d7951e948a99
draw-clear = przezroczysty
# en: b1985e387405e4d4afb40d5dac9b2656f5d6f770
draw-shapes = Kształty
# en: 4bab2d8fe13fa6ab57f80098b414f0f734c5dd25
draw-more = Więcej
# en: 34f9968677e8b728f4405bf338fba32c66bd2a77
draw-icon = Ikona…
# en: 64dd60fe1a049fe6db3eb1369dec2e42bf428e21
draw-background = Tło
# en: e1946387893c804aeadc93e5df5af3416cf1dc53
draw-remove-background-tile = Usuń tło
# en: 1d0c8304baedcf8e3a78982c2e7c0b04622bf2a0
draw-color = Kolor
# en: cfdd099c4751f2f9aef2491f411111906956e0f2
draw-arrange = Ułóż
# en: 8c4e184c7224521ecdb958ef6eb40a05b5171f9a
draw-no-fill = Bez wypełnienia
# en: 7adb6736cf2c9ae017b128f98738ffbae0e58655
draw-fill = Wypełnienie
# en: 1f65ed95fba62cd5b74b58c2ca9ba63448117160
draw-bring-to-front = Przesuń na wierzch
# en: e259d4e19e695a41e2f10680f2e3f5693711382a
draw-send-to-back = Przesuń na spód
# en: 972d57379db3e5be76d4ead709fef1ad71ff03d6
common-duplicate = Powiel
# en: 5301648dcf6b53cefc9ed52999aaa92d4603cae0
common-edit = Edytuj
# en: f6fdbe48dc54dd86f63097a03bd24094dedd713a
common-delete = Usuń
# en: d7bc7e98ec7a8acfd61dabe29e1e9156adf86fb9
draw-put-icon-on-this-shape = Dodaj ikonę do tego kształtu
# en: 33bde816f0f7a53b8de67b8f8d6981f47e28159b
draw-place-icon = Umieść ikonę
# en: 4fc05f2763ba31e2d3be5f08e7d0bab5d5dcbf78
common-zoom-in = Powiększ
# en: a4ae4b24a1f5369c2bff61abdbc221170e4b27d8
common-zoom-out = Pomniejsz
# same
# en: e30eff925100b7c3e119ed678e39009e962455b0
draw-alt = Alt
# en: f978200b112084eef0c088e1d0075ad2fbca39cf
draw-alt-text = Tekst alternatywny
# en: 5cb1c64554b7e1dc72e12360f2d04f33dc206b1d
draw-alt-text-alt = Tekst alternatywny: { $alt }
# en: d039700b1af48db561cd71c056aed2737e8fae32
draw-add-alt-text-describe-this = Dodaj tekst alternatywny: opisz ten rysunek osobom, które go nie widzą
# en: 676f1e162fc4f58007821f7c1a55b893e9a04715
draw-what-does-this-drawing-show = Co pokazuje ten rysunek?
# en: c8636572fb4b9e79bae4c9fef82fc8109961c471
draw-diagram-of = Diagram przedstawiający…
# en: 5a33f2e7e84274a5291191ca3105e62d897eee0e
draw-read-aloud-to-people-who = Czytany na głos osobom, które go nie widzą, i zachowywany z rysunkiem wszędzie, gdzie zostanie osadzony lub pobrany.
# en: 988c63b77eade4f718f9d469cb36e35bff976839
draw-describe-from-shapes = Utwórz z kształtów
# en: ac302ae45938c985822f097507602d624128f1d0
draw-tap-or-drag-to-paint = Stuknij lub przeciągnij, by malować; strzałki przesuwają, Enter maluje.
# en: ea263dc45b04f2755ac61a51deecc96ade3fb6a9
draw-tap-each-corner-tap-first = Stuknij każdy narożnik; stuknij pierwszy jeszcze raz albo naciśnij Enter, by zamknąć kształt.
# en: ccdc55c46a79ea604962ddda9cc010311bdca4fe
draw-drag-to-draw-end-where = Przeciągnij, by rysować; zakończ w punkcie startu, by zamknąć w kształt.
# en: ef5a6074bd843b506d359711212e8236802d80c4
draw-press-on-one-shape-and-let-go-on-another = Naciśnij jeden kształt i puść na drugim.
# en: 1005cc8c1dafc1f9eb422bf2ac68290b492fdfd1
draw-now-other-shape-tap-it = Teraz drugi kształt: stuknij go albo wybierz strzałkami i naciśnij Enter.
# en: e3686f1c55ec91e31825e1d9510abf592d80b08a
draw-drag-to-move-them-together = Przeciągnij, by przesunąć je razem. Shift+stuknięcie dodaje lub usuwa kształt.
# en: eb36764c60ec7a17dd6ac3ec7dbbd22ee401778e
draw-press-on-one-shape-and = Naciśnij jeden kształt i puść na drugim
# en: 199f4e86afea4f2d42eb40b63ce8599168575e06
draw-tap-where-icon-goes = Stuknij tam, gdzie ma być ikona.
# en: 86da5e24511bad8c1cace935e830c0625b04b607
draw-drag-on-canvas-to-draw = Przeciągnij po płótnie, by ją narysować, albo stuknij, by umieścić.
# en: a5742851f0f81d3bdcf184cb2a164390f3e989bb
draw-eraser = Gumka
# en: 5136ae1b5bfe9175a6ed64915e648bdc240443a7
draw-pencil = Ołówek
# en: d60e52fb8066ebf1bf1329750c068e7042c783fd
draw-clear-grid = Wyczyść siatkę
# en: 45ecea7c16e725c14cfec68f5b12d1545f222a73
draw-use-as-background = Użyj jako tła
# en: 507f52dfd67fb731677bb9ae6971f9b5e891bc84
draw-grid-is-now-background-download = Siatka jest teraz tłem. Pobierz ją jako kafelek albo użyj na dowolnej stronie przez tile:.
# en: 209a1a74ee8eec09b861bc34e5ddb08a1357a364
draw-pixel-grid-n-by-n = Siatka pikseli, { $n } na { $n }. Strzałki przesuwają; Enter maluje bieżącym kolorem.
# en: a9deda2292f9b3c9a827e2aa71e0da6b4db9f16e
draw-row-y-column-x-ink = Wiersz { $y }, kolumna { $x }: { $ink }
# en: d316afce8845f59e541c981d07d81bab22858d00
draw-as-repeating-background = Jako powtarzające się tło
# The contextual bar under a shape, and its words typed on it.
# en: 27bb3dadbebca64cec249a9811a07cd3ea25a520
draw-dashed-line = Linia przerywana
# en: 8953b1fb5c8eeda2158dfd09bde1a766d4b9079d
draw-dotted-line = Linia kropkowana
# en: 6597b9e38708468a6ada223bbd324b34dd9b8d23
common-edit-words = Edytuj tekst
# en: 73a03229ad334f953ab9119481b53f881218d015
draw-extra-large-text = Bardzo duży tekst
# en: a489f3e9ff96e710da6f0dad589e2e4f58ba2dde
draw-gray-fill = Szare wypełnienie
# same
# en: d160e0986aca4714714a16f29ec605af90be704d
draw-l = L
# en: d7f442ef62cb3d9ac929d5c992b5daf0ca7721d3
draw-large-text = Duży tekst
# same
# en: c63ae6dd4fc9f9dda66970e827d13f7c73fe841c
draw-m = M
# en: 3142905be6683e711043cf1317f0beb5a495ee4b
draw-medium-text = Średni tekst
# same
# en: 02aa629c8b16cd17a44f3a0efec2feed43937642
draw-s = S
# en: 11cc69c6f994eeb6dd90a55a7ce3bbc682544f87
draw-small-text = Mały tekst
# en: 6e9a379022a3fda2be5039485a0a092130c73f70
draw-solid-fill = Pełne wypełnienie
# en: dcfb9c041348e0d62c058f37225ad2185472edc8
draw-solid-line = Linia ciągła
# en: b233a397b799e80f21b88a34ae7e30af0528d1c1
draw-shape-in-hand = Zaznaczony kształt
# en: 6be4ddf808de37e8c50aae4f621dd09b03f5a4e6
draw-words-of-shape = Tekst kształtu
# en: 1737205dd1aad709dc2209b2e892ffb8c4de0fc8
draw-type-words-enter-is-done = Wpisz tekst. Enter kończy, Shift+Enter dodaje wiersz, Escape anuluje.
# same
# en: a2f9d0d16d02a20ef369e6029d9e5929c3d70d3e
draw-xl = XL

# en: aba6eb7da15924b741fdff98ff19be9915cd84f1
draw-drag-to-move-corner-handle = Przeciągnij, by przesunąć. Uchwyt w rogu zmienia rozmiar, okrągły obraca. Enter lub podwójne stuknięcie edytuje tekst.
# en: 9cacab39109399036915a6b67336853e622472cd
draw-drawing-canvas-v-selects-r = Obszar rysowania. V zaznacza; R, E, D, L, A, T rysują; strzałki przesuwają; [ i ] obracają; Enter edytuje tekst; Delete usuwa.
# en: 4421c5912fa5d727f23883b0a69028e195e3717b
draw-tap-shape-to-select-it = Stuknij kształt, by go zaznaczyć, albo obrysuj kilka. Wybierz narzędzie, by rysować.
# en: 6f72f3cd1255e9bb344a1f9adb5fc64770f07cd5
draw-rotate-left = Obróć w lewo
# en: b75f23d1d0e44603289911e22ad5efd66157913a
draw-rotate-right = Obróć w prawo
# en: 4e41a56fa9e8996a27760c0b9c78c126b0892d19
draw-pixels-n-n = Piksele { $n }×{ $n }
# en: 6469ebd3a4fdb9e64f402eed612d2bfc0e0bf746
draw-align-center = Wyrównaj: do środka
# en: b25d3dd496584e2c6258aa9c77cc555dfd5988a4
draw-align-left = Wyrównaj: do lewej
# en: e65f83bdf0bfbca6e0efd3f75baa155ab6652113
draw-align-right = Wyrównaj: do prawej

## the Animator

# en: a6b8b600c27ce95ddcf867cfc503564c89fe816a
anim-animation = animacja
# The templates: what each motion is, in a line.
# en: ec026663a7e4c23dd850c7f5a96deef71bf8bb81
anim-lift-off = Start rakiety
# en: 5d15aaf0784e98385ffc925f574edbf1a0657292
anim-rocket-climbs-away-with-its = Rakieta odlatuje wraz z cieniem, gdy słowa się unoszą: dwa kształty, po dwa punkty kluczowe.
# en: 1cc22feeb4a82e33a9fd435fbf7c4a927a0408e1
anim-bouncing-ball = Skacząca piłka
# en: 567b2c86aa06b4d0133474a39dc6545196754a25
anim-ball-falls-faster-and-faster = Piłka spada coraz szybciej na podłogę, a jej cień rośnie pod nią; odtwarzana w przód i w tył, odbija się bez końca.
# en: 7296aa4a483797a1a82ec05a4598688ca056cd36
anim-loading-spinner = Wskaźnik ładowania
# en: ccf7f6eb9188fe228da413a1aaf39c5ee4994346
anim-eight-dots-in-ring-each = Osiem kropek w kółku, każda po kolei pęcznieje, więc jasny punkt krąży, gdy strona się zapisuje.
# en: 691f884e182237907640c6964bda657a5ffec1c0
anim-title-card = Plansza tytułowa
# en: 56d07df6f27b468d9e3456707110962e1da029c6
anim-red-curtains-part-on-opening = Czerwone kurtyny rozsuwają się w wieczór premiery i wyłania się nazwa festiwalu: odtworzona raz, zatrzymuje się na tytule.
# en: 1383ce3b8f642f2c5946975ca61e868e4a504819
anim-present-hops-stars-and-hearts = Prezent podskakuje, gwiazdki i serca kołyszą się wokół niego, a życzenia świecą tęczowymi literami.
# en: fad7f01d931894b10da998319cdc82f1a7d7e4dc
anim-quick-standup = Szybki stand-up
# en: 79d688c0e9e1f3c402c3d6bedae252cfdd0b27aa
anim-meme-with-caption-above-and = Mem z podpisem u góry i jednym u dołu oraz zegar, który kręci się i chwieje pomiędzy nimi.
# en: 7e9b34abf6e91127f94374508015ad795c91268b
anim-build-is-green = Build jest zielony
# en: 2015347d0927e36755702bf7ae8677fa8d565545
anim-meme-in-two-lines-of = Mem w dwóch wierszach czcionką Impact i puchar, który wlatuje w obrotach, ląduje i rozbłyska.
# en: 98eb193445404588fd801a26b8383def925748ab
anim-flash-card = Fiszka
# en: 864aea3fc448ba5b87612d5e8c4c6dafde49b09a
anim-card-shows-spanish-word-turns = Fiszka pokazuje hiszpańskie słowo, obraca się, by pokazać angielskie, i obraca z powrotem: obrót wokół pionowej osi.
# en: 23015d1cbacca964e41f5cbb0021ed050964a9ed
anim-weather-this-week = Pogoda w tym tygodniu
# en: 8dc082991f9eea4f537ecd34d66858c28b08bcb6
anim-four-days-of-weather-in = Cztery dni pogody w Lizbonie, każda ikona ożywiona: słońce się kręci, chmura dryfuje, błyskawica drga.
# en: b8224dd56d927c2c68b1498f39b7a2ed20f88c57
anim-new-year-countdown = Odliczanie do Nowego Roku
# en: 6b46f602f1762ee9ef676cfb3d455fba6a9a07df
anim-three-two-one-second-each = Trzy, dwa, jeden, po sekundzie, potem nadchodzi nowy rok tęczowymi literami: odtworzone raz, zatrzymuje się na życzeniach.
# en: e004a532912502de514d6c1801dcc60517d6007a
anim-flight-path = Trasa lotu
# en: 69049056a83981f31dea9f7350b7356570e735b3
anim-plane-crosses-dotted-route-from = Samolot przelatuje kropkowaną trasę z Nowego Jorku do Lizbony, wznosząc się po drodze, z godzinami lotu u góry.
# en: 7de4868fea7340b1b7e0779ba2e81218c703ab57
anim-neon-sign = Szyld neonowy
# en: c0cba8072586f9c04d65da0f16b714c865f261e1
anim-cafes-sign-at-night-name = Szyld kawiarni nocą: nazwa migocze, godziny wyróżniają się poniżej, a filiżanka świeci i pęcznieje.
# en: fadf71c7ea92e6416fd6d89969f8e78a115cd3c1
anim-sunrise = Wschód słońca
# en: 672c99d7a4f36fb3de226944eb862e3c9faa5663
anim-sun-comes-up-from-behind = Słońce wschodzi zza wzgórz i wsuwa się poranek: głębia, rozmiar i panorama miasta narysowana piórem.
# A key is a moment a shape is set at; between keys it travels. The effects (Impact … Blur) are meme looks.
# en: dc6828c6d02be5a4b4480bdf9e7f606c74b5ffd1
anim-animated-gif = Animowany GIF
# en: c81fe6cce809d8d3f0bacf4a00e1c62251061d39
anim-video-webm = Wideo (WebM)
# en: e643c3f72a4f8b13abefb3c30793c8dbb2e124d4
anim-animated-svg = Animowany SVG
# en: 3b906156eac7b4b957d3a83ab79a3846fa2c900f
anim-empty-stage = Pusta scena
# same
# en: 64fe85d796d8c2eda594dbc0b7b3452a4a2c444b
anim-3d = 3D
# en: fe12532bd63a2e75713ec69be11e92d48e9db3c8
anim-add-key-here = Dodaj klatkę kluczową
# en: 900aa998d3550d438fc20a414d3938fc3a1630ab
anim-blur = Rozmycie
# en: df0e298e356261439795d0d435ce0ce576604c65
anim-depth = Głębia
# en: 8f25a859269ca51039632dd6bba28fb061cfb8d4
anim-effects = Efekty
# en: b10a3addcfc5d7372c3a6101402e1f910da21188
anim-frame-n-s-s = Klatka { $n }, { $s } s
# same
# en: 62036a7016ec20273ff717698fbad321c4ff002b
anim-impact = Impact
# en: 4c0a5de85ac9512b6a503ba785c3f369b5cfbda2
anim-key-at-s-s = Klatka kluczowa w { $s } s
# en: 74adc5789ce92de7bbb5e3d84a287a1ce6d3e7f5
anim-mirror = Odbicie
# en: a7b93d2128e820f861fc8dfccd9f5521e89ad21f
anim-mode = Tryb
# en: 987e5e1f455e03766d3ef3740947f4db46336d53
anim-moments = Klatki kluczowe
# en: 76cdb950721642b6b8596d36d5a39f7705028b99
anim-move = Ruch
# same
# en: 00706b5e9ede7f2fb6145370efd20ef72969df11
anim-neon = Neon
# en: 781961bc81c25697841ecce5d4d9dad9f6b261c6
anim-pause = Pauza
# en: 5d12bd53552cafc41ca6146c04870df2e1574e13
anim-play = Odtwórz
# en: fa968bd1155bd76231814d479bf070ed96cca9bb
anim-pixel-art-is-made-in = Pixel art powstaje w Rysunku; Animator porusza kształty.
# en: b4a9395d25398654fd5d000e4b82a1d8273339bd
anim-rainbow = Tęcza
# en: 3d5096b70833fdae355f1ffcf32faf2066123467
anim-remove-this-key = Usuń klatkę kluczową
# en: aa0e7e86b7aa21e9851b9db8b752998918d2b608
anim-shadow = Cień
# en: b7152342a267362add3c0d7f69f720f7a9c76c9e
common-size = Rozmiar
# en: 4a6c11ab8104f8bcbb26155a8f68688d181f8a4b
anim-spin = Wirowanie
# en: 598549d7818087a7d04d49a7b9c00979c8a35c96
anim-stage-alt-arrow-keys-move = Scena: { $alt }. Strzałki przesuwają zaznaczony kształt (albo czas). Przecinek i kropka przechodzą o klatkę. Spacja odtwarza. K dodaje klatkę kluczową.
# en: a4277f79218220e03e7d4ebb5b1417cbdff137dc
anim-shapes-in-hand = Zaznaczone kształty
# en: 6c82e6dd86807ee3db07e3c82bec1ae1ce00b08b
anim-time = Czas
# en: 4ad8d1291a5b6b81cd03b1408570e1aae781c074
anim-wobble = Chwianie
# en: ac906b0770d1cc5e8330907f0063ba444eb3cf5b
anim-now-s-of-all-s = { $now } s z { $all } s
# en: c7f73bb54d928922c3838bb789ee9fb8a5b1eb37
anim-settings = Ustawienia
# en: 89798935dfbced66a46a24ee534e23bbf5281faf
anim-this-frame = Bieżąca klatka
# en: cac09d8898c2435fb48b3b387ff152da7929eab8
anim-duplicate-this-frame = Powiel tę klatkę
# en: 885c46b03eaf682f7c9534f7791ddfc3da84cd6f
anim-frame-earlier = O klatkę wcześniej
# en: 2c3d7664e236cb8254795d8ffd3761741ccfff7d
anim-frame-later = O klatkę później
# en: bb4f3c806dbc9e6d5247da5b492939d83c90cf2b
anim-delete-this-frame = Usuń tę klatkę
# en: 406ce96669c44a0f4b79e02af1464b6aa7fbf232
anim-draw-shapes-move-sets-them = Narysuj kształty, a potem użyj Ruchu, żeby je ożywić.
# en: b4d477d39704ecbf21ca422aeebffbad5a519fbb
anim-nothing-here-yet-draw-something = Jeszcze nic tu nie ma: najpierw coś narysuj.
# en: 00f1eed948284854e29d59b2de928756b7f69388
anim-tap-shape-then-drag-it = Stuknij kształt, potem przeciągnij go tam, gdzie ma być.
# en: e4cabeb67c10b273fc4a1cfba538ac893c850f68
anim-drag-it-to-where-it = Przeciągnij go tam, gdzie ma być w { $s } s.

# en: b0d1915925616cc03de525611bfe58839cf5fdff
anim-anything-from-drawing-tool-moving = Wszystko z Rysunku, w ruchu: położenie, głębia, rozmiar, wirowanie i obrót w czasie, z efektami do memów.
# en: 739720909d046c563acd15a980c916ae9b0a75f7
anim-back-and-forth = Tam i z powrotem
# en: 7753216f948c789b0cbd5cfb16d1f50c1717383b
anim-forward-then-back = Do przodu, potem z powrotem
# en: e3e7a3833d19706ebf33b2c3baf8e05deeed7bca
anim-frames = Klatki
# en: 0d0b09dfb5d45add0e2f90ec8b193d96ace76d0c
anim-frames-second = Klatki na sekundę
# en: 3570d228949889218e4c7fdb4ad8c942753530a1
anim-how-large-shape-is-drawn = Jak duży jest narysowany kształt: 1× to tak, jak narysowano.
# en: c028f533678015b6ac2e606a9cafef7e050b11aa
anim-length-speed-and-repeat = Długość, szybkość i powtarzanie
# en: 72f516ede84adba7283e1f7f5fd8eb787c7d33b0
anim-loop-forever = Zapętl bez końca
# en: 41b5b25a66d56fd91f645cbe6f83603567c3c480
anim-play-once = Odtwórz raz
# en: 368e8081b781aac177fd07c2415b694b1f878911
anim-turn = Obrót
# en: b2343125992a36aa775f5740930f717a0d1a76d6
anim-turns-shape-about-its-upright = Obraca kształt wokół pionowej osi, jak fiszkę: bokiem przy 90°, odbity dalej.
# en: dbe0717b0567202674ba26238e862ff18b3ffbbc
anim-turns-shape-around-in-plane = Obraca kształt w płaszczyźnie sceny, jak koło.
# en: df7db1873937e8acd60c26ebf93191ad27b738e6
anim-which-shape-is-in-front = Który kształt jest z przodu: bliższy kształt jest rysowany nad dalszym, a dalszy trochę ciemniejszy. Głębia nigdy nie zmienia rozmiaru.
# en: 2931befb0fbc6bdabcff5b420bf41435e4315548
anim-n-times = { $n ->
        [one] { $n } raz
        [few] { $n } razy
        [many] { $n } razy
       *[other] { $n } razu
    }
# same
# en: 4a84fdfdafe66c2c85e3e7d7c434de987984470f
anim-s-s = { $s } s
# en: b78baea4121d1dfde75020adb28737da7ea84e59
anim-frame-back-frame-on = Poprzednia lub następna klatka
# en: ad3441e7c85b25bc4c7f46fd051345a6ba241e58
anim-nudge-shapes-in-hand-with = Przesuń zaznaczone kształty albo przejdź o klatkę
# en: fe13ca0956192777b5060b354cf8e5dc5553c328
anim-play-or-pause = Odtwórz lub wstrzymaj
# en: d3b310dc90b3cc480984236a80101888836acfe9
anim-first-frame-last = Pierwsza lub ostatnia klatka

## the Outliner

# The bullet is the line to the parent; a join between any two items is a connection. { $from } and { $to } are items' words.
# en: e8fb468f67bca1564ff499175d1b146c6ccd5d3a
outline-named-label = , z etykietą „{ $label }”
# en: 02d7116f49a426f4a9dba7a6582ae90478795f7d
outline-book = Książka
# en: 8f9c05748f1616a4649174a8917da3ee5f3217e5
outline-decision = Decyzja
# en: c35876d5fcc88c6a4c142c7c0e391dda3f92ca08
common-talk = Wystąpienie
# en: 69d33e95f4f69c18d9591a8529f59a6703fc1f85
outline-empty-outline = Pusty konspekt
# en: b972f73739624a697a0aa9bdde4289bafc5b6e4b
outline-outliner-ideas-under-ideas-folded = Konspekt: pomysły pod pomysłami, zwijane i rozwijane, przenoszone i łączone; to samo drzewo, które czyta prezentacja albo mapa myśli.
# en: 3d47762769e98192ca611ea7fce028e70e16f174
outline-arrow-from-from-to-to = Strzałka od { $from } do { $to }
# en: 081c7d75d7a6b1052f5643338773de8ea68de0dd
outline-arrows-both-ways = Strzałki w obie strony
# en: 1e1c0cc8db067d827d10382e4329a748d2e3b54d
outline-as-page = Jako strona
# en: 16b6e0c696afc500fe76af1de5165a0563e80afc
common-calculator = Kalkulator
# en: adab5090ac6a1b7b5420faac7be86c41721ba27c
common-calendar = Kalendarz
# en: ab732cac31bba434b0b59309a30ce46956dc3d54
outline-cancel-connecting = Anuluj łączenie
# en: 5301648dcf6b53cefc9ed52999aaa92d4603cae0
outline-change-it = Edytuj
# en: 1ed0b58d18ef647be5de11840bb929ecc8e36446
common-chosen-items = Zaznaczone elementy
# en: b65463cb6a42a17de514acc4659f7fd331e0876a
outline-connect = Połącz
# en: f2ea879cf86d5519e3459e15ee70080a4a1306ab
outline-connect-from-words = Połącz od „{ $words }”
# en: abfb16b3d00afef63f7ed53ad9ababbf2328b5d9
outline-connect-from-to-to = Połącz „{ $from }” z „{ $to }”
# en: 378e916868a3e40a71abc67a748f7faacc94be85
outline-connection-from-from-to-to = Połączenie od { $from } do { $to }
# en: 8f3509b64e0ea82c53329cb49a7756bd1ced3566
common-connections = Połączenia
# en: af74f7c5362aaee985bf8cda3dd75fc80751ce51
common-copy = Kopiuj
# en: 153d7a58b3a3e898fcbdd04c462af308414bd09d
common-comment = Skomentuj
# en: 849e384559ff16cb2dcddb75cdf0a07437bcc3f9
common-open-this-change = Otwórz tę zmianę
# en: ba97113463234ae7bc314eae6a172572b35b1b71
common-presentation-builder = Kreator prezentacji
# en: 20dcb3b3184067197035f08a5a3955d51fcd94a3
common-diagram-maker = Kreator diagramów
# en: 0d84b3e5992959bf9adbeef94468228a5827605f
common-drag-to-move = Przeciągnij, by przenieść
# en: 52db9dc3ff903f6d241a91adcbd83848467106c2
outline-draw-as-mind-map = Rysuj jako mapę myśli
# en: 03683dee41f9db7fad6f8d06c6c6bd776b528ba0
outline-draw-as-network = Rysuj jako sieć
# en: c01d65d48941d40cf0e4bad6bc84c525d99421da
outline-draw-as-org-chart = Rysuj jako organigram
# en: 3159fe421b3221381b3c778dc1c3c26e4540be37
outline-empty = Pusty
# en: 4a66d1480779180159cc25c1c5aa9d760467c6a7
outline-everything = Wszystko
# en: 9cf188d3a6779d63b36b10275b0228ae22ec97d6
outline-fold = Zwiń
# en: ec898362fe9593764e822dd17c78f1f972c20d90
outline-fold-all = Zwiń wszystko
# en: ecdda59aea5ee67d7d854c969ccf7f4f4b4a4c54
outline-item = Element
# en: 6f8c7dbc09548197b5d210f514dda19a015102b2
outline-item-n = Element { $n }
# en: 120ee44bec923665b04dc825b0307fe159232ce9
outline-kind-of-line = Styl linii
# en: 789062517bc27b8cb5c78b1e88041e5bef69b507
common-launch-plan = Plan startu
# en: 72eee0aaa10010ae7d362761115dfd7e064dd4d4
outline-line-from-from-to-to = Linia od { $from } do { $to }
# en: 2859ccc92143006360893c2a9cb1aaaa13b3928f
outline-line-named-label-change-it = Linia z etykietą „{ $label }”: edytuj
# same
# en: 52d55422c1936db72f18f5b9e960c2719a3560d7
common-animator = Animator
# en: 260ff8ae7182fc851337b6b2fdb25f8cac2b8d47
common-move-down = Przesuń w dół
# en: 8a58f7b7ea514cbdf9bb23a231ad4d03f0cd0ca7
outline-move-this-item-drag-it = Przenieś ten element: przeciągnij go na inny
# en: b4f57cd0cd5c7d88461c1718646713dea47a36c9
common-move-up = Przesuń w górę
# en: 5b2d4bd98ab95d9eae0b3c956cbf98aefe9d7793
outline-name-of-line = Etykieta linii
# en: 3aea913567c437a81d3c153ce49d321f64099651
outline-numbered = Numerowane
# en: 89db2d16f087d4e687143e9a0071f77af473f9d8
outline-opml-for-outliners = OPML (dla edytorów konspektów)
# en: b22f39c9558f672318bf617175bf3daaa236c71f
common-open-in-new-tab = Otwórz w nowej zakładce
# en: cdd6290b6b2860663a3ff7c60cbe70af640e9c39
common-outline = Konspekt
# en: d7f6278b9a3a511b82633cbd63a4e86e91bab2d1
outline-outliner = Konspekt
# en: e57362d579b61ac9d08f5012ee0adf6fde22a855
outline-outline-lowercase = konspekt
# en: db2483000d154ca9fd74d41fc4e063a4b28faa87
common-paste = Wklej
# en: e45795fb6033ae4ecc1e2e3610273fce71a317d7
outline-plain-line = Zwykła linia
# en: 9580fcbce0c31ceaa47eb583e5f7ce637fdc8a0a
outline-plain-text = Zwykły tekst
# en: 67ea25b11508ee37fa6c09bc9d3a1d6aa9a30f96
common-show-as-slides = Pokaż jako slajdy
# en: 59df6d7de818cdbeb08aa7f083aff96c1bccd1f5
outline-show-as-outline = Pokaż jako konspekt
# en: b306a7c32ba84dd4adea8612dccc99c15065eb53
outline-take-away-connection-from-from = Usuń połączenie od { $from } do { $to }
# en: e963907dac5cd5c017869b4c96c18021c9bd058b
outline-take-it-away = Usuń
# The compound bullet (Paul, 2026-10-15): the statuses a document sets in its head, a status's pill, a due day's chip.
# en: e92aab82fce62899699581b5597abdda8175f2dd
outline-statuses = Statusy
# same
# en: bae7d5be70820ed56467bd9a63744e23b47bd711
outline-status = Status
# en: c206561903295f2cf5944906fdfc55f1e8a5d45b
outline-no-status = Bez statusu
# en: 1bcdd54c54c2bbd162c6353f5157804ce2270af5
outline-status-status-tap-for-next = { $status }. Stuknij, aby zmienić status
# en: 4c1aeebc433bcb8eb4b05434619ea3136b785ea8
outline-due-date = Termin
# en: bfe11361dd8dc7cc66f5cd6f33d394a95c71c96c
outline-due-date-ellipsis = Termin…
# en: 1cfca97d4ac1000c67f7b345992a5b58b3dac4b0
outline-due-date-change-it = Termin { $date }. Stuknij, aby zmienić
# en: 6cf55f3558276e2eefff5dd41ec206dc9780bebf
outline-remove-due-date = Usuń termin
# en: 891e9d6d47f1bacfcba2dca1b282afcbcd25d94d
outline-agenda = Harmonogram
# en: aa73cdd3260a16a41d572c06ee0da42cb4b85286
outline-by-status = Według statusu
# en: 0e719dcbe720c315d66c977072f10251b56bd994
outline-nothing-to-do-yet = Na razie nic do zrobienia. Tu pojawiają się elementy z zadaniem, statusem lub terminem.
# en: 064c87e25e9cca38db987bafd98c9fc9b3003456
outline-line-to-parent = Linia do „{ $parent }”
# en: 99fec066e5bc2f5acc70261b4b5dd4b171fb491a
outline-arrow-to-parent-item = Strzałka do „{ $parent }”
# en: e37f9b066587aa06d9d2f6df504727599d9f5e4a
outline-arrow-from-parent-item = Strzałka od „{ $parent }”
# en: 27228d1a3266064e49da7e3949d339b08473e294
outline-edit-statuses = Edytuj statusy…
# en: 70dfe3298343e43d0c29f07274084a4ce961dd7a
outline-add-status = Dodaj status
# en: 4f9beff18cc6852b012093ba97421788466bb3bf
outline-gray = Szary
# en: 23376bab580fd3f3d521c66a65a03e7753da54cc
outline-last-status-means-done = Ostatni status oznacza „gotowe”. Zadania z tym statusem są zaznaczone jako wykonane.
# en: 7312a31a2c880f2d456663b6f91ad6da980b3a5e
outline-take-connection-away = Usuń połączenie
# en: 656e5c87ae5cd391807e13c85fb32635c2d441c2
outline-tap-item-to-connect-from = Stuknij element, od którego łączyć.
# en: 7a717eefe223e502e86655b5bf8eb999b867a9dc
outline-tap-item-to-connect-words = Stuknij element, z którym połączyć „{ $words }”.
# en: 6ca2aebe7601f4f49f7f7df1ac23a0ac4a39abbc
outline-question-options-under-it-and = Pytanie, opcje pod nim i dla każdej to, co przemawia za nią i przeciw.
# en: da74cb6baba7a464fd8881af861a8c8d7952aff9
common-trip-planner = Planer podróży
# en: 09ae5dce4d22019190e52d1611d1544becf36489
outline-twenty-minutes-in-three-parts = Dwadzieścia minut w trzech częściach: problem, pomysł, co to znaczy; w prezentacji po slajdzie na każdy główny punkt.
# en: 2af9d498f852995329b0033573277dce32d09ba0
outline-unfold-all = Rozwiń wszystko
# en: f5857a77d395db75bc57c2c76b92dc8fa4773053
outline-unfold-n-inside = Rozwiń ({ $n ->
        [one] { $n } element
        [few] { $n } elementy
        [many] { $n } elementów
       *[other] { $n } elementu
    })
# en: 621521f9a8788695ec292cbec54d2792cfdf0a7d
common-untitled = Bez tytułu
# en: 1e65f823e3600c2c4cec7aff6db37af296fca073
outline-view-as = Pokaż jako
# en: 828c360c884f9246750461eea43fee4e42c6b52c
outline-zoomed-in-on = Skupienie na
# en: 38eca6735f66d186c0bd9c549873e774551dc35f
outline-a-plain-line = zwykła linia
# en: 884abd948f43aba4e5851b71a20e97aed7a6c96e
outline-arrow-from-parent = strzałka od elementu nadrzędnego
# en: b1efb9ef91ffdf7d42595fb81fb8b74184a5efbc
outline-arrow-to-parent = strzałka do elementu nadrzędnego
# en: 54406ea0a263efcf4d3204fff2200f7f4d982c90
outline-arrows-both-ways-lowercase = strzałki w obie strony
# en: 0048342aeabb8b2918689354650579bb2108a957
outline-e-g-owns-feeds-reports = np. jest właścicielem, zasila, podlega
# en: e7292866259d82c2071011b0e5de8b80407998e7
outline-item-above = element wyżej
# en: 973c239ffbd8d0522cea9cfa9e2664d2a96a2e01
outline-this-item = ten element
# The templates: their names and blurbs (templates.md says what each is for).
# en: 5c3a8ec4fdc8ab96e7ef9f3a0739b0639c6ca926
outline-company = Firma
# en: 8a7edf5c70300a3c146de3a15b534939e72226da
outline-decision-tree = Drzewo decyzyjne
# en: c59b4e8c614eaaf02a0ac81499bc50947192118e
outline-family = Rodzina
# en: 3ac1f9e665cb59f3a08ee0fba150dbbf4aab85a8
outline-five-minute-retirement-toast-opening = Pięciominutowy toast na emeryturę: wstęp, trzy historie, toast, każda część z czasem w swoim wierszu.
# en: 9ed550a11b44d369413c1b004a5008d3c127a6c1
outline-novel = Powieść
# en: 35c9710d58daeb1aebb2143cfaeda278f0f67311
outline-product-launch-product-marketing-and = Premiera produktu: produkt, marketing i wsparcie pod nim, z połączeniami między gałęziami.
# en: 79fd5c646ff9b077d10357db663c9b7d59acb64f
outline-research-plan = Plan badań
# en: 6a1ae380627dbc8fe79ff6a208c76b89d230979e
outline-speech = Przemówienie
# en: f081caaa6b5cd7b0858a4a87cc6f81bdb215fd30
outline-syllabus = Sylabus
# en: 5b163ae0d9a3fd9b5ab6a8b6c27374091ceb25de
outline-ten-week-course-when-and = Dziesięciotygodniowy kurs: kiedy i gdzie, numerowany temat na tydzień, jak oceniany i co czytać.
# en: 9cea5f42a5742d9eef722836a7a7b59c6a5c0c5a
outline-thesis-two-arguments-with-their = Teza, dwa argumenty z dowodami, zarzut i odpowiedź na niego oraz zakończenie.
# en: e5f2a2c3f76b55d5786f1c311773def62d6920f3
outline-essay-plan = Plan eseju
# en: d926d538e1be8112e81292507985514feac5e4c4
outline-draw-as-family-tree = Rysuj jako drzewo rodzinne
# en: bfef6f97dfb8178f726a96b8861bc2536e8c6fb4
outline-five-days-in-lisbon-packed = Pięć dni w Lizbonie, rzeczy spakowane według kategorii, z tym, co zrobić przed wyjściem z domu.
# en: 987acdf86bb6a373c995aa374c004bb21bf2e576
outline-indoors-or-out-for-saturday = W domu czy na zewnątrz na sobotni targ: odpowiedzi na każde pytanie w jego wierszach, tak i nie.
# en: 61390a6b5d7d9268827d91b4a818c6a5fbe2011c
outline-no-internet-at-home-question = Brak internetu w domu: pytanie na każdym kroku, tak lub nie, aż do telefonu, który trzeba wykonać.
# en: b431e4b41d5021ff680bdee33aebda8738cec5b0
outline-packing-list = Lista do spakowania
# en: 013532bb7e7d08afa22a3149f8e74b5ee4d9eaf5
outline-parts-and-chapters-of-book = Części i rozdziały książki o ideach, z wierszem pod każdym rozdziałem na jego główną tezę.
# en: 5f646cfc8f40ae2515c9d774ae5ad523f524b998
outline-people-and-three-acts-of = Postacie i trzy akty rozdziałów, każdy z tym, co się w nim dzieje, połączone tam, gdzie postać zmienia rozdział.
# en: dbb00953c7a1565bffce71190cfb90220362c471
outline-question-method-budget-that-adds = Pytanie, metoda, budżet, który sam się sumuje, harmonogram, ryzyka i lektury.
# en: 57b065618d9af543d6fcc5085edd94aa723f8403
outline-three-generations-and-next-each = Trzy pokolenia i następne, każde z latami, narysowane jako drzewo rodzinne z menu.
# en: 285ec850c11d78bac10f6bfa31b69a37f1b257c9
outline-troubleshooting = Rozwiązywanie problemów
# en: c126bf3ee80a183d7c300cd69a01e39ab7dd8e53
outline-who-works-for-whom-at = Kto dla kogo pracuje w dziewięcioosobowej piekarni, każdy ze swoją rolą, narysowane jako organigram z menu.
# en: 0c6266451117f0382231513e4c30d38fb976086e
outline-pdf-sections-and-bullets = PDF: sekcje i punkty
# en: 32897da2f696f1ddc73da9ef0575827530a80b1a
outline-fold-unfold = Zwiń lub rozwiń
# en: 74341e3c271df3c784e595b804b1f90be0f80429
outline-name-line = Etykieta

## the Presentation Builder

# Its templates: the occasions and a second of each printed format.
# en: 44467d7b18daac8d8100b68ebc482fe0ee0ac9b6
deck-choirs-winter-concert-welcome-both = Zimowy koncert chóru: powitanie, obie połowy, uwagi o muzyce, śpiewacy i słowa do wspólnego śpiewania.
# en: a816093d69f08b81c457d818e6d1bd72e0915b10
deck-lesson = Lekcja
# en: e2d04797e440ee0933d032a29cfbfad5edbc99c7
deck-lost-pet-poster-in-red = Czerwony plakat o zaginionym zwierzaku: imię, jak wygląda, gdzie ją widziano, numer do kontaktu.
# en: 4d44cafa1d032ca3ceda90fa9830717ea5cf8491
deck-morning-workshop-schedule-checklist-of = Poranne warsztaty: plan dnia, lista kontrolna tego, co zabrać, kroki i dokąd iść dalej.
# en: 7dc13283809d7ed9c506873aee1486fd988cfe5c
deck-pick-your-own-farm-what = Gospodarstwo samozbiorów: co rośnie kiedy, jak to działa, ceny, stodoła i jak trafić.
# en: b822b42bfed453711aed6a262083b2a7aef5cd89
deck-pitch = Prezentacja pomysłu
# en: a9964d2d4aae75e70e2e8dace25022b6679f25d7
deck-product-in-sentence-what-it = Produkt w jednym zdaniu, co robi, ceny w tabeli, daty premiery i kontakt dla prasy.
# en: a46e6eb74ae783d7eb35ae76afc5ab984683886f
deck-trivia-night-in-four-rounds = Wieczór quizowy w czterech rundach, tabela wyników i odpowiedzi na ostatnim slajdzie.
# en: efebc637859160a6f694e66576eebb294de14712
deck-residents-meeting-about-new-playground = Zebranie mieszkańców o nowym placu zabaw: dlaczego, co proponowane, budżet jako wykres kołowy, kiedy i jak zabrać głos.
# en: 02e7a62fc65ed26cb0751706a5ea8f5783414eda
deck-science-lesson-on-chalkboard-aims = Lekcja przyrody na tablicy kredowej: cele, co uczniowie wiedzą, model, sprawdzian, praca domowa; notatki nauczyciela pod każdym.
# en: f3a66c7b2a6ebda85ea74938fce4c397eae2a131
deck-seed-pitch-in-eight-slides = Pitch dla inwestorów w ośmiu slajdach: problem, produkt, wzrost na wykresie, model biznesowy, zespół, czego potrzebujecie.
# en: aab8da6eadee157bba3937e9dc00741cfe48b13f
deck-bike-shops-quarter-for-its = Kwartał sklepu rowerowego dla wspólników: przychody na wykresie, sukcesy i porażki, liczby, które się liczą, następny kwartał.
# en: d0fa5e5696edaf949dfe9e739a7a2eef0d433ae2
deck-small-story-in-panels-about = Mała historia w kadrach o pożyczeniu czegoś sąsiadowi.
# en: 6c1ff81a2445a9eab1616588060b483cd5b6cde8
deck-twenty-minute-talk-with-speaker = Dwudziestominutowe wystąpienie z notatkami prelegenta na każdym slajdzie, wykresem wyników, przypisem i wnioskami.
# en: 1a2fac58a0b80e771b6d2e526e7d3fee2cf6ef85
deck-badges-for-conference-each-with = Identyfikatory na konferencję, każdy z rolą i miejscem pochodzenia, w motywie Ocean.
# en: 7aa6a43fffd387b34fc7d06c7845de3f5bef745a
deck-comic-umbrella = Komiks: parasol
# en: 1796880ad702715de60aad7227c9bdca655f0fff
deck-concert-program = Program koncertu
# en: 3843bc86872f81764fe670a10bd1192b5a78018c
deck-conference-badges = Identyfikatory konferencyjne
# en: cae2fc32956e250bfadb1c6411ff593e325cf580
deck-conference-talk = Wystąpienie konferencyjne
# en: 27fa527134938f2343573a9c4485c57bc7e6167e
deck-farm-brochure = Broszura gospodarstwa
# en: 6bd753630675cfdfe68c546580b14419bd8e80a4
deck-lost-cat-poster = Plakat zaginionego kota
# en: dd7cf099a356a9e69908104ae2d8c2743ba41fb7
deck-product-launch = Premiera produktu
# en: 68d708c4452b9eaca2d5d38e9d0a5848059fd138
deck-quarterly-review = Przegląd kwartalny
# en: ca40a6181df561c65b71e9ebdf580ccae6b007b7
deck-recipe-zine = Zin z przepisami
# en: 02bfd82260b75fe685e4e972cb9a3ae9b0a42f5f
deck-seven-soups-for-cold-week = Siedem zup na zimny tydzień, po jednej na stronę, w zinie złożonym z jednej kartki.
# en: 44b5c7f041391d8b41a8ba365b6f13522877b478
deck-their-story-for-reception-from = Ich historia na przyjęcie, od tego, jak się poznali, po oświadczyny, z osią czasu i podziękowaniem.
# en: 2aaeb944a6b05f452d512dc7dd5220adeee294ea
deck-town-hall-notice = Ogłoszenie dla mieszkańców
# en: 14444c384d263fff25ba48b195abb55def791b75
deck-trivia-night = Wieczór quizowy
# en: 0377beb012ed13e1986227ef8915aeab709ad5d9
deck-wedding-slideshow = Pokaz slajdów na wesele
# en: f34f4184c545fd4fec60bbc441ead88d1f1fdd1b
deck-workshop-agenda = Program warsztatów
# en: e4c8d951f1cc300d96873c7cfc850ad0f0ddaab4
deck-presentation-lowercase = prezentacja
# en: 1e35470a39e5b3ddca4d3b585c9011db9b4c4dc6
deck-slides = Slajdy
# en: 5075541433d31fb8cf207ced97577686ac3fe961
deck-chosen-slides = Zaznaczone slajdy
# en: d7935967cfd3de8f11b33801800bece8d90cb55f
deck-move-this-slide-drag-it = Przenieś ten slajd: przeciągnij go na inny
# en: 19926fc5c47a7a39dd1435da06e3fc4c027458ea
deck-slides-titles-bullets-two-columns = Slajdy: tytuły, punkty, dwie kolumny, duże ikony, inne dokumenty na slajdzie; albo zin, książeczka, broszura, komiks, plakat lub identyfikatory do wydruku i złożenia.

# The layouts, the transitions, the formats
# en: 7509c5747e5db3dfa3373afc42eca9f5b27a8599
deck-bullets = Punkty
# en: 8d8f0f25822179c33b917613ec2d022ef593c340
deck-two-columns = Dwie kolumny
# en: 1d6bece457daf37f906239468dadfdfb619adb98
deck-big-icon = Duża ikona
# en: 5298d08bb7ae7d01f4efcdbb94ff03fc487fd11c
deck-fade = Zanikanie
# en: 38d13bda5c40afc32d629f81dec6c156cbea328e
deck-cut = Cięcie
# en: 38d13bda5c40afc32d629f81dec6c156cbea328e
common-cut = Wytnij
# en: a5d5b46a7720824b51da4be0af97f5cfd1168cd0
deck-slide = Wsuwanie
# en: 9b3cbed5c490c07473546a88768ba29b787e9e52
deck-zoom = Powiększenie
# en: d4ff278598ebbd3f36cecf27e68c66de49d2f62f
deck-zine = Zin
# en: 8ef5c45547ec6440e6dde4870e3f92d6c08dfbaf
deck-booklet = Książeczka
# en: 80dceb58c1f9daca0ebaa066d80e670cfdf1123e
deck-brochure = Broszura
# en: 5549c5222b1b1eb52e37ae3542dcc0f7cb9fd376
deck-comic = Komiks
# en: a33539ca77a6c42fd7a1e50aef1516b3a87d7c85
deck-poster = Plakat
# en: be13a787e958beeb3139d8e1b3ebc2b879732db2
deck-name-badges = Identyfikatory

# The themes (the Look menu) and the icon colors
# en: 34118050b206b7ee3e5bcb8e4adbe8c17630020d
deck-plain = Prosty
# en: b6369ed60eb9bda1aa642868ddfb5053547f0206
deck-boardroom = Sala konferencyjna
# en: 39973be20679a94e4c998a58c0f6c76daaf6cd11
deck-ivory = Kość słoniowa
# en: 558287ddcc3557b09ec00ca17b3e4be7e6645858
deck-midnight = Noc
# en: 220c98deb1482e5b5361b123b929ee8e4ac1e18d
deck-graphite = Grafit
# en: 79141e063e10bb80a7b799878f12312eb89fbafd
deck-confetti = Konfetti
# en: 181bcd5760fd32163554c899301a30b2cd381cf4
deck-sunset = Zachód słońca
# same
# en: 76022a00a16b0482beec04274945ed192a931410
deck-ocean = Ocean
# en: 07a59415416c4f5915d5efbe6319ca69450f0a77
deck-bubblegum = Guma balonowa
# en: bc727a101b60bbc2b4f96365ecf1ee4bd1db685a
deck-arcade = Salon gier
# en: 5efe442a0ed9b1e51ec7e85696d66d6ac3db83a8
deck-chalkboard = Tablica kredowa
# en: 5f941ab65fbabe87f41cd73c9136f5a4c97087e8
deck-fun = Zabawa
# en: 0bd48966c3fe51c025c34a472af7fac64b2292dc
deck-themes-color = Kolor motywu

# The bar
# en: 4e9f7a31eef4c69e0aacb643f6856372cd6e3247
common-present = Prezentuj
# en: 3c47e73f6a8bcb018bdbe91d9312e8e1777050f7
deck-see-sheets-to-print = Układ wydruku
# en: ca742a9ecf2f35a59704398ead009f1d8e554a0c
deck-back-to-pages = Wróć do stron
# en: 442250df38e5e516ff1c2ce97d051b8997c7d976
deck-headline = Nagłówek
# en: 1cd715cdb2322da76e4ce7f490064782c83337b2
deck-layout-layout = Układ: { $layout }
# en: e85e5488b4184d6cfb4c0aa36e169a271068ec0f
common-look-theme = Wygląd: { $theme }
# en: 896afdc59964bf4da2b261b6056d23286d186427
deck-transition-transition = Przejście: { $transition }
# same
# en: 438dcf262325319835f0d0aefa8a4ecddaf49a16
deck-format-format = Format: { $format }
# en: f16eadab2a72ff13044cc806dbcf2c117b32244f
deck-printing = Drukowanie
# en: d5939283a7a53a72f09e4f327bc22f2872b64257
deck-one-sided = Jednostronnie
# en: 256dd8b8869a6c72f553a2905aef393f2b39df0d
deck-fold-and-cut = Złóż i potnij
# en: 8cb849ee6e612fbad8641d053d8e66b2ba560a1b
deck-two-sided = Dwustronnie
# en: b82a2c3204554a9c0a82b44aa7eb5f94916b1c13
deck-cut-and-nest = Wytnij i wsuń
# en: 6e19d7b7deffd2974f632ec3e697646de978130e
deck-end-with-qr-code-of = Zakończ kodem QR tej prezentacji
# en: 0c7dca360d478b76246b0ddf594aed2299af3ef2
deck-move-slide-up = Przesuń slajd w górę
# en: 8e87a8ca3749be93e307f172d62814c1b58865b4
deck-move-slide-down = Przesuń slajd w dół
# en: 3a260e90c0d893d60ed227c10bfade84b5a2adef
deck-delete-slide = Usuń slajd
# en: e984a8f80b4d34ad2ca73e2a3a432a6a08a6db27
deck-move-page-up = Przesuń stronę w górę
# en: 21c3799bf3525e9642bab926aa4f81f07a5d8a0f
deck-move-page-down = Przesuń stronę w dół
# en: 260b69625056e26e4029491cf672306054bf10a6
deck-delete-page = Usuń stronę

# Insert
# en: fffd75e48f61364f8486681ac4213184abd2373f
deck-bullets-slide = Slajd z punktami
# en: 6e281f49affc0fc305e572fc6d08a6ca82a597a1
deck-title-slide = Slajd tytułowy
# en: 8401be1cb1b1122b954639aeea6e348e2c709b23
deck-two-column-slide = Slajd z dwiema kolumnami
# en: ecca8f3f7107aaa37ae2674734c101faac7e3e11
deck-big-icon-slide = Slajd z dużą ikoną
# en: fb06270f7c212baabc8749ffc36e49dc8f321548
deck-page = Strona
# en: 31f820710f9d6c3e03e8b9e5996902c45a8816da
deck-title-page = Strona tytułowa
# en: 9b0d34e9841a2c5fa15e4c9e68c01f338dc34930
deck-two-column-page = Strona z dwiema kolumnami
# en: cfdc49e689f75ddfc0372d83f7c9a396b6616dd8
deck-big-icon-page = Strona z dużą ikoną
# en: 17a4bbb4cefcb0a1fccf38f1c561b2a18fe44456
deck-four-more-pages = Jeszcze cztery strony
# en: a59879f8796236335931a0b95f1cb1a1db39e210
deck-on-slide = Na slajdzie
# en: 9bab04556dc2a912d86a00f7b4dcd7c540468b8b
deck-on-page = Na stronie
# en: 600584c2d5ccb97c0c0c424d9f32d6b102fcb040
common-pages = Strony

# The canvas
# en: 028137d1d6f1cf21777ce8a83b467b80e04a6168
deck-add-icon = Dodaj ikonę
# en: f68895d5ec9c6f1865e9ee69f1d423cbfd251599
common-change-icon = Zmień ikonę
# en: fd8de0a92eedac5ccdf6c587b3ae177b97da0ae0
deck-pick-icon = Wybierz ikonę
# en: 3805391efb1ea53cff43e62a0dc134be9b14bd8d
deck-left-column = Lewa kolumna
# en: e8965b7c19d1ad62de75e624088e40b37d16f206
deck-right-column = Prawa kolumna
# en: 58952208e1b00c3e046eab00b1e20bb448262df9
deck-one-bullet-line = Jeden punkt w wierszu.
# en: a32090c9358d8e112f4074c11a76811a50d53d5c
deck-one-bullet-line-tab-steps = Jeden punkt w wierszu. Tab zwiększa wcięcie.
# en: f8948a4a523b4312c5567f9cff1f6788c757998f
deck-line-or-two-under-title = Wiersz lub dwa pod tytułem
# en: 236bcf1c6a83d3b0f85a065c777d7948b22a0c22
deck-what-this-page-says-type = Tekst strony. Zmniejsza się, by zmieścić się na stronie.
# en: e80e281dac24d9c4c3f60dcdbf8700e9603b825e
deck-panel-line-what-is-said = Kadr w wierszu: kwestia | podpis. Ikona dodaje obraz.
# en: 3d6e76c9325034deb76b92c8cc47a2d3c22fcdf3
deck-speaker-notes = Notatki prelegenta
# same
# en: f0ea152b4f68c54e5bc3476bae70301bc7fb2523
deck-n-total = { $n } / { $total }
# en: 3b73ff036c4ba5dc509f9a2e55189b33fc8013bb
deck-document-on-slide = Dokument na slajdzie
# en: 800ddde9b84d77765694212f6af1a9ed4329c77c
deck-remove-from-slide = Usuń ze slajdu

# The rail and the sheets
# en: 7e4475e68efd3a93e2aa3ad794afd9388b4c89d1
deck-slide-n = Slajd { $n }
# en: 5f78f871f6b48ae876a1dbe89a5b8bff6f6b9849
deck-front-cover = Okładka
# en: 95842f717432a63230077bc5ea48addf5bc52947
deck-back-cover = Tylna okładka
# en: 10e4725d5544e065501162abcf8a53b94451df0c
common-page-n = Strona { $n }
# en: dd19f9887573a9f06294de48329bfb1b3a5ad273
deck-front = Przód
# en: 6f453fd2a404a86955b0f23219d84f2bcb4e7d06
deck-inside-left = Wewnątrz: lewy
# en: 4fe87c5667532867fc721531b92a7ca6b391eb8a
deck-inside-middle = Wewnątrz: środkowy
# en: 3e654f345b202e7b158b2c61ff91fe55b0d3d46d
deck-inside-right = Wewnątrz: prawy
# en: 418bf9a5530258c65b3dbc1f932667dafa01469c
deck-inside-flap = Wewnątrz: skrzydełko
# en: b52b36b7269fbfc58ec24bb724691951a3decbe8
deck-back = Tył
# en: 3369aa225b34e01144a4c49dd350db04732a2720
deck-badge-n = Identyfikator { $n }
# en: 9cc25309d07de0adfb989faaaaa74f7cb5a06e38
deck-last-slide-added-for-you = Ostatni slajd: kod QR tej prezentacji
# en: 03c90c8e6a7e028c2e9caeadc1961fb5c0ad4e57
deck-ends-with-qr-code-of = Prezentacja kończy się kodem QR, żeby publiczność mogła ją zabrać. Przycisk QR to wyłącza.
# en: 13c7cb226b093919972f5e423aeb0abae93960cf
deck-qr-code-of-this-deck = Kod QR tej prezentacji
# en: 5d5bc5601280c776405941347bbf7e9c63dc3954
deck-sheet-side-n = Arkusz, strona { $n }
# en: 1982f74c2102a55783a4774ddd4895dc7fec26f0
deck-cut-along-dashes-this-half = tnij wzdłuż kresek · ta połowa idzie na zewnątrz
# en: 0fc0c2932d66df46e1af55ac50d98be2bccd63c3
deck-print-on-back-flipped-on = drukuj na odwrocie, odwracając po długiej krawędzi
# en: e0226944c5e9e4df97a3bf718ac488a8a51118fa
deck-cut-along-dashes-fold-along = tnij wzdłuż kresek · składaj wzdłuż kropek
# en: b0ccda7ec0d37c14d00e5e9f57eeadcb1045ebd7
deck-print-it-double-sided-on = Wydrukuj dwustronnie na papierze letter, odwracając po długiej krawędzi, w rzeczywistym rozmiarze. Potnij wzdłuż kresek, połóż górną połowę na dolnej i złóż je razem pośrodku.
# en: 7d7f71d31c8968c0555f49f9430133796d626c4f
deck-print-it-on-one-side = Wydrukuj na jednej stronie papieru letter, w rzeczywistym rozmiarze. Złóż na pół wzdłuż dłuższego boku, potem na ćwiartki; natnij wzdłuż kresek pośrodku; ściśnij końce i złóż w książeczkę.
# en: ce30358159a7953f092af19e48f7dad47608c83d
deck-print-it-double-sided-on-letter-paper-flipping-on-short-edge-at-actual-size-stack-sheets-in-order-first-on-outside-and-fold-them-together-down-middle = Wydrukuj dwustronnie na papierze letter, odwracając po krótkiej krawędzi, w rzeczywistym rozmiarze. Ułóż arkusze po kolei, pierwszy na zewnątrz, i złóż je razem pośrodku.
# en: 96bf1a2ba3e6d649669efc225b3104521735ff25
deck-print-it-double-sided-on-letter-paper-flipping-on-short-edge-at-actual-size-fold-right-third-in-then-left-third-over-it-front-is-on-top = Wydrukuj dwustronnie na papierze letter, odwracając po krótkiej krawędzi, w rzeczywistym rozmiarze. Złóż prawą trzecią część do środka, potem lewą na nią: przód jest na wierzchu.
# en: 6d4cc8d4405840522000283a7e419c1c93e89392
deck-print-it-on-letter-paper = Wydrukuj na papierze letter, w rzeczywistym rozmiarze.
# en: f81a8cbfa80cae20e64c2c1dd92fec6cfefba6c9
deck-print-it-on-letter-paper-at-actual-size-cut-along-dashes-six-badges-sheet = Wydrukuj na papierze letter, w rzeczywistym rozmiarze. Potnij wzdłuż kresek: sześć identyfikatorów na arkusz.

# Presenting, and the closing slide
# en: 6e875951a6f9aa1374d93572de657c12ded57355
deck-presentation = Prezentacja
# en: 50f94286ba30706a19070d3ec0a0c8d34d6cf6eb
common-previous = Poprzedni
# en: bc981983e7f547dc62e19a1e383acfe00782a6d5
common-next = Następny
# en: 10225bffa1614015caa499978578b424eb0ee56f
common-stop-presenting = Zakończ prezentację
# en: 1380030776f8bb0e462fd6e828a563e49da50652
deck-slide-n-of-total = Slajd { $n } z { $total }
# en: 70440046a3dc2e079f23ee1c57dfa76669b732aa
common-notes = Notatki
# en: bd0dad7cbf71b13b2e545d8ce477027ffc106b45
deck-n-hides-them = N je ukrywa
# en: 45c44dc2566819f835fd788e2b7a6c5bee5177c4
deck-take-this-deck-home = Zabierz tę prezentację ze sobą
# en: acc1edc431e346786fab17d4f10e195ca72257d6
deck-take-this-deck-home-title = Zabierz tę prezentację ze sobą: { $title }
# en: 7fc2d8c7fd4164039149b5a9f2063ddf7ab9d76a
deck-scan-code-whole-deck-is = Zeskanuj kod: cała prezentacja jest w linku.
# en: a0f82f698bc01f5dc90c760db684589e2d8277eb
deck-a-qr-code-of-this-deck = Kod QR tej prezentacji

# Downloads
# same
# en: a149055ecee5f95be2951f0b5454f3d1ef47c786
deck-powerpoint-pptx = PowerPoint (PPTX)
# en: 7660a22bdc9507edd353dd61198b9aa86488d936
deck-picture-of-every-slide-zip = Obraz każdego slajdu (ZIP z plików PNG)
# en: 98a41f54e049532b6032b88d7656348adc178c2a
deck-animation-of-deck-gif = Animacja prezentacji (GIF)
# en: 3bab526d831e1024e6f8e7d197f9c3d72cc4f0e4
deck-film-of-deck-webm = Film z prezentacji (WebM)

# The templates
# en: e5604bc465a212ad3d7f4e13ed282f030d9d3a6b
deck-title-agenda-three-points-with = Tytuł, plan, trzy punkty z notatkami dla prelegenta i zakończenie.
# en: 60c974074604818e661eff7940285669d1496647
deck-status-update = Raport z postępów
# en: 34714be3698c31c72afb1d4d4b8a7b0c69f30fc5
deck-done-and-next-side-by = Zrobione i następne obok siebie, potem ryzyka, potem prośby.
# en: e946db45d2689df95cbac9f8137664409c51f5d8
deck-proposal = Propozycja
# en: 52ab7599cc26432ef9b492b401d04eee1ca5e699
deck-what-you-heard-what-you = Co słyszymy, co proponujemy, kiedy i ile to kosztuje.
# en: b8e1f28fed63f996c8915470a7ee9ce8aef9b75f
deck-eight-small-pages-from-one = Osiem małych stron z jednej kartki papieru: wydrukuj, złóż i potnij albo czytaj, stukając na telefonie.
# en: 31b11edde49cd1bd80a198f240426c5b2d8cd65f
deck-booklet-of-half-letter-pages = Książeczka ze stron w formacie pół letter, od ośmiu do dwudziestu, ułożona do druku, wsuwania i składania.
# en: ae07389f7b537dbd7eb3007d3f2b36ca3c35c404
deck-trifold-brochure-six-panels-on = Broszura trójdzielna: sześć paneli na dwóch stronach arkusza, każdy tam, gdzie wymaga tego zgięcie.
# en: 88c71dbca35b2e7c498adce21174cb1102af384e
deck-mini-comic-panels-with-picture = Mini komiks: kadry z obrazem, dymkiem i podpisem, złożony z jednej kartki.
# en: e610bb7f6eac1dd5622723ccc779e31e9d9ed190
deck-poster-or-flyer-headline-and = Plakat lub ulotka: nagłówek i kilka linijek, tak duże, jak pozwala jedna strona.
# en: ec024ffdc152af00e77f7219a5293545bdd3bb65
deck-name-badges-for-meetup-one = Identyfikatory na spotkanie, jedna strona na osobę, sześć na arkusz, gotowe do cięcia.
# en: 9a51ba7142888f3e0199896de291a1fb4b4298f1
deck-edit-this-deck = Edytuj tę prezentację
# en: d5947c525ed0d53dce794385a2cc1cd6e2459dbd
deck-new-slide = Nowy slajd
# en: 720856fcb53d62f79a364c36d8cd2314121430a6
deck-presenting-back = Wstecz (prezentowanie)
# en: a212c73bb85a53b57609d239c50f170773e07d77
deck-presenting-next-line-or-slide = Następny wiersz lub slajd (prezentowanie)
# en: e53a09169fa399b79b5b814de5e65669714f9165
deck-presenting-whole-slide = Cały slajd (prezentowanie)
# en: 7722768d8b861ddedb1f6400352985ca0cfd4a08
deck-slide-before-slide-after-on = Poprzedni lub następny slajd

## the Calendar app

# en: e4ffacba5591440a14a08eac7aade57c603e17c0
cal-calendar = kalendarz
# A span is an event on the calendar or a task on the schedule (the Gantt view); { $every } is "Every week" and the like.
# en: 11fcad4bfe2782393e5d2ac5e04d65349890ea94
cal-name-yours-say = Nazwa (na przykład Twoja)
# en: e288d42e3bba2f9fc3b7f2287d2ea4f141e72236
cal-schedule-phases-with-their-tasks = Harmonogram: fazy z zadaniami pod nimi, postęp każdej z nich, premiera na końcu.
# en: f0424f3e15f33d07de80ddfd02a4b56f047767d7
cal-week-earlier = Tydzień wcześniej
# en: 5e63d8681fdc3170ed99fc3abcc3668620f299ca
cal-week-later = Tydzień później
# en: ab455a2fb151da1c7d0c39c7534c2f935e028ce9
cal-weekend-of-sessions-at-set = Weekend występów o stałych godzinach, późny występ po północy.
# en: 114574336ac7883aebd0653b3fc5e82f9262dc86
cal-all-day = Cały dzień
# en: cbf28df446643f9968f7fe68968bca51be5cf792
cal-chart-scrolls-sideways = Wykres (przewija się w bok)
# en: a13d5b9d3da48c8bade3d645e0de9a9bb812c648
cal-color-for-new-color = Kolor nowych: { $color }
# en: f6bb0f468a8569c67b3d6826e57e62c5500c3681
cal-days = Dni
# en: b50e483c45f8f17795b63f822127ff0171086900
cal-days-and-times-on-month = Dni i godziny w miesiącu, roku lub harmonogramie, w dowolnej strefie czasowej.
# en: 9ccd3e7bb11493f1e93950f7db9148a4794037b7
cal-done = Zrobione %
# en: a7028454f240815938eaf701823b7d55dbaf98a9
cal-edit-event = Edytuj wydarzenie
# en: 8a4d4e6eb9a367d616b8a4cbfa2792068482e884
cal-edit-task = Edytuj zadanie
# en: 99570f85bb2bae0dbe3e8f2f3d6d6f765ee7c47e
cal-choose-task = Zaznacz: { $task }
# en: 72b4644a41881ce4e156ce3283119c74f598cbea
cal-day-earlier = Dzień wcześniej
# en: 8d6915ee723c8b3c01f29002cfed7d597d56c2c7
cal-day-later = Dzień później
# en: 66a755ea0d935aeac763da63deebb69b0eb54ba9
cal-dates = Edytuj daty…
# en: a2bb9d34b8a1a79665858d354585cf147e0dee4e
cal-end = Koniec
# en: 89d10cd6c1e1437d6318d6fbb25a40e0aaaddd34
cal-end-date = Data zakończenia
# en: cd7800da7f4ff94a0e14445d7f94b6345d1b7b8a
cal-end-time = Godzina zakończenia
# en: 91856dcb7d93f9c6725649160ab6abe379d8e5c9
cal-ends = Kończy się
# en: ad8919ace091b14011c6439cfd5e1707b58f5abd
common-event = Wydarzenie
# en: 3b2eb5131055ad07ac1d08de2f11f900286a51b5
cal-every-day = Codziennie
# en: 7f3932f9cb96cb99072771c992c0ce3c0b342bfb
cal-every-month = Co miesiąc
# en: 043058e2050c0345ef7aac78bd9025d3adce099a
cal-every-week = Co tydzień
# en: cea537cd72239840db0466ba29562d222299f7ce
cal-every-year = Co rok
# en: 557ea666ac9eafe1543ea9c4423073c8be815d79
cal-family-calendar = Kalendarz rodzinny
# en: 05061b43a7c1a210598d8a217347a96fdb45df8d
cal-festival-weekend = Weekend festiwalu
# en: a3f5851f7cb29b64859b01ec6429ea85811bb192
cal-how-many-times = Ile razy
# same
# en: 834c5ef85d6fd469b8be75d8685faf6f9e84eaa7
cal-icalendar-ics = iCalendar (ICS)
# en: 4bcc328bf3b5b886738db678a175936615491289
cal-its-own-zone = Strefa czasowa kalendarza
# en: 2a177256a408fa4fc557b301041589b798826d70
cal-last-day = Ostatni dzień
# en: 58ef633830b461aa76bf4ee90e3b2831ff588508
cal-lessons-birthdays-and-holidays-color = Lekcje, urodziny i święta, kolor dla każdej osoby, cotygodniowe sprawy się powtarzają.
# en: 7c7f5d049fad2569721d446c4a811f9bd5da5393
cal-level = Poziom
# en: 082bc378cd60e17a38d99898b21955299c5b60c8
cal-month = Miesiąc
# en: 770d509550265dba792aa81868b856eb67225e41
cal-my-zone = Moja strefa czasowa
# en: 80c3052d33ccdee15ffaaa110c5c39072495fe63
cal-never = Nigdy
# en: 2ef3795c979293106a6ccf13359d732165fb660a
cal-new-event = Nowe wydarzenie
# en: 25d3553217b2058be97b5339fbe6a576cfeb6856
cal-new-event-on-day = Nowe wydarzenie: { $day }
# en: 17b2b838c5ce22c961a36736534a5029d6ba0087
cal-new-task = Nowe zadanie
# en: 8abf7cf1d0b36ff16ebbe26b8285a65d9d1582f6
cal-next-month = Następny miesiąc
# en: 22c6f667e4103029954aa28d43a1d4888122b35f
cal-next-year = Następny rok
# en: 1562a21cadb04e59b670cb3e32fb54f1777db699
cal-no-tasks-yet = Nie ma jeszcze zadań
# en: 3b2069a4f745374e50f8992752888822ce851db4
cal-no-tasks-yet-insert-task = Nie ma jeszcze zadań. Wstaw zadanie.
# en: 855dec4a50f5117b51b7f32b59771f28855942ac
cal-nothing-on-calendar-yet-tap = W kalendarzu jeszcze nic nie ma. Stuknij dzień albo przeciągnij przez kilka.
# en: 27d7bd5f744f76fc1ad85bbe975e9fdca473eaeb
cal-nothing-this-month = W tym miesiącu nic.
# en: 46a299215300b3a0de6931f926bc6b0f2283eb99
cal-previous-month = Poprzedni miesiąc
# en: 2f866c70871d37f90c24fefa28d87cc19d8850c3
cal-previous-year = Poprzedni rok
# en: 580110a84277d369b216be5a01a5ba50868d4d3f
cal-project-plan = Plan projektu
# en: 6ae5ee3e66205a8b1a41c80c4db0dcc982e50f44
cal-repeats = Powtarza się
# en: 0a8adac9d6d5f4d14ee887d196cd8618f0f3391a
cal-schedule = Harmonogram
# en: e7fe53f0503eb82f8c80f9b233fa566339a9f9e8
cal-show-times-in = Pokaż godziny w
# en: 952f375412e89ff213a8aca383d18e5691354347
cal-start = Początek
# en: ff99f5b5f7948dfa71fd545b3d99f5f00856ea29
cal-start-date = Data rozpoczęcia
# en: 88d8206d586abe4c8e35c8e9adcc649d07c99a1e
cal-start-time = Godzina rozpoczęcia
# en: fc612a2fcc722bde9d98ae18bea42764812b6784
cal-starts = Zaczyna się
# en: 0e648419ea806b0cc4db81617f95870a094f3639
cal-stops = Kończy się
# en: 480b9be2834a2278919632171f788a9a80d5d743
cal-same-dates-as-gantt-chart = Te same daty jako wykres Gantta
# en: 7ea6dec71584012ab4044cc464dc601741ff2c50
cal-this-calendar-is-written-in = Godziny w tym kalendarzu są w strefie { $zone }.
# en: e10c10f818ac8e510b74062cde201eae4e8d8c66
cal-this-calendar-names-no-time = Ten kalendarz nie ma strefy czasowej, więc godziny są pokazywane w Twojej ({ $zone }).
# en: 1b4785331db3b08cd8e3cfa4bd36216731a79e54
cal-this-month = Ten miesiąc
# en: eea79afd832854a3b24153b928ee9c62c7457dbe
cal-time-zone = Strefa
# en: bf5efde33adface92f37d1888e904ab70c9ce272
cal-times-in-zone = Godziny w: { $zone }
# en: 650642b1d6b4b1ecc4ad7d38bbdf110d582c4baf
cal-times-or-on = razy lub do
# en: 69bd4ef9fbd0894a22759c3766b859defbdedbc8
cal-view = Widok
# en: 97211a8888128314d9ca34d1005f08cb83ed5d9c
cal-what = Co
# en: 879e32326c5217968ac8e3a14e4a8a5214957264
cal-year = Rok
# en: 6189fbfe149a418e2f6d1af4dd71b04f6aa0c50e
cal-color-stands-for = { $color } oznacza
# en: 63e5df0eb2fcd351c1d31f23cdf3bf4816e3def5
cal-every-until-date = { $every } do { $date }
# en: 519c383aaa892cfff62e992bb947ec79ed5dd57d
cal-every-n-times = { $every }, { $n ->
        [one] { $n } raz
        [few] { $n } razy
        [many] { $n } razy
       *[other] { $n } razu
    }
# en: d69842d42eceddee8c62019d22d4f7ca383cf847
cal-n-days = { $n ->
        [one] { $n } dzień
        [few] { $n } dni
        [many] { $n } dni
       *[other] { $n } dnia
    }
# en: 0cf851711322b556de4e3e932cdf083d7444c723
cal-n-done = { $n }% zrobione
# The templates: each name, then its line on the home page.
# en: 71428a822d08efae1d13babd6073592abec99d1f
cal-bakerys-posts-and-newsletters-through = Posty i biuletyny piekarni przez zimę, co dzień opowieść adwentowa.
# en: 91dad831b9be334af672cd6052e37dedde16d06e
cal-youth-soccer-season-practice-every = Sezon młodzieżowej piłki nożnej: trening co tydzień, mecze u siebie i na wyjeździe w swoich barwach, play-offy.
# en: d7bad656f3b06c3ee989a1f2960214ee15b2f788
cal-small-teams-time-off-public = Urlopy małego zespołu, święta państwowe i świąteczne zamknięcie w jednym kalendarzu.
# en: cd6036648af6d0d5614f0ec65eb732300281e059
cal-community-garden-plots-year-when = Rok na działce w ogrodzie społecznym: kiedy siać, sadzić, zbierać i przycinać, co roku od nowa.
# en: 1b04e3c7d585a3d6297852d158919c9833538a01
cal-fall-term-from-first-day = Jesienny semestr od pierwszego dnia do Bożego Narodzenia: zamknięcia, kółka, wycieczka, wywiadówka.
# en: f80b28faa22109c4d14cf7eb7994768abca09ca8
cal-bills-and-renewals = Rachunki i odnowienia
# en: 2223281ed9222907f9d00ef35ab71df263d06e46
cal-conference-agenda = Program konferencji
# en: 87695adec8581b20111f35794592bb162c32e800
cal-content-schedule = Harmonogram treści
# en: 072b8e4f3e23cdd58cf0a4b3f5c47437127f131b
cal-editorial-calendar = Kalendarz redakcyjny
# en: 26f861d8db0e97575e814ce9799eaf1bcddec28b
cal-every-autopay-on-its-day = Każde polecenie zapłaty w swoim dniu co miesiąc, roczne odnowienia i terminy podatkowe.
# en: 2185215436152ae5c1d9429385551e46587c7af8
cal-garden-calendar = Kalendarz ogrodnika
# en: 624b49bb82a8487f3ff77d2098b88b1e1ceb6695
cal-vacation-planner = Planer urlopu
# en: 1ceb786961989ab69eda934e08645ecb19fe5357
cal-league-schedule = Terminarz ligi
# en: 5a94fcfb3e67abfdd4e3bab4c3d9a2683801245a
cal-school-term = Semestr szkolny
# en: 2f88af7308e60cbfbe5482a13acec0983b020e09
cal-training-plan = Plan treningowy
# en: 5ef83b6b17b42f15d49c31f33e46ca8d4427e6ae
cal-twelve-weeks-to-half-marathon = Dwanaście tygodni do półmaratonu jako harmonogram: baza, budowanie formy, szczyt, roztrenowanie, start.
# en: fdab2603fde2488e117cca6335baee3c481231b9
cal-two-days-of-talks-and = Dwa dni wystąpień i warsztatów co do godziny, kolor dla każdej sali.
# en: c8bbdc31a9be182914dd6207c08837389224b33a
cal-two-issues-of-quarterly-from = Dwa numery kwartalnika od tekstu do sprzedaży, comiesięczne spotkanie i premiera.
# en: 0e4753002a6b042b841f5296f0cdb7c71110377b
cal-volunteer-schedule = Grafik wolontariuszy
# en: f6003458ea2ce51dfa0efa7d0819ccb57ac35bd1
cal-who-does-which-shift-color = Kto ma którą zmianę, kolor dla każdej osoby, w banku żywności przed Bożym Narodzeniem.

## the Diagram Maker

# same
# en: 8737093597f4fbcf30fb6cb5d44b96f338f143c1
diagram-diagram = diagram
# One app, eight kinds (mind map, org chart…); a 'thing' is whatever the kind is made of: an idea, a person, a step.
# en: a6c5e06888a8fcbcb520ea2a9952009715b62e25
diagram-mind-maps-org-charts-family = Mapy myśli, organigramy, drzewa rodzinne, tory procesów, osie czasu, diagramy Venna, plany rozsadzenia i sieci, rysowane z kilku linijek.
# en: 5c943d9da9c2dfa4508b7318865477cb55850904
diagram-empty-diagram = Pusty diagram
# The kinds, one of each kind's things (Insert's item), and how a line of each is written
# en: fcb9bd322ef2e2b0e304d49bdafd2842995a47e6
diagram-mind-map = Mapa myśli
# en: 2cd7504a5a56c5729f37aca4d0234b698e0c0afe
diagram-org-chart = Organigram
# en: f78fddbccd57da0c8456fd39da6c21cdc0371020
diagram-family-tree = Drzewo rodzinne
# en: 5a79fb6ed9e87efcbde2485d08845fe16296c303
diagram-swimlanes = Tory procesów
# en: 018514a3d58aa08353dd5e387ee29de45981c409
diagram-timeline = Oś czasu
# en: e5c282f3e15ca1cf6a0b7837f7c7cd8b2bc12783
diagram-venn = Diagram Venna
# en: 840cfb1a1746bbb150371dbcf3ed341983a80c11
diagram-seating-chart = Plan rozsadzenia
# en: 53ebc572b4a44802ba114729f07bdaaf5409a9d7
diagram-network = Sieć
# en: bd69a4732fe12702d5ff5838852eb29e4a9e2e02
diagram-idea = Pomysł
# en: 8c41ae88467fe5bbad09fcd488662b25c3ec5333
diagram-person = Osoba
# en: dc416e1088e4bf094dfc9abe0210e0288f5a169e
diagram-step = Krok
# en: 448ab73ba1c21e671e218fb91f2644c834f0c16f
diagram-set = Zbiór
# en: ecdda59aea5ee67d7d854c969ccf7f4f4b4a4c54
diagram-thing = Element
# The picture, and the line editor over a thing
# en: c2e45b49b02d2ac7e1baf25d9d0a2f5c257281ad
diagram-tap-empty-space-for-thing = Stuknij puste miejsce, by dodać element. Aby połączyć dwa, naciśnij Połącz i stuknij oba albo przeciągnij jeden na drugi.
# en: d4b16450c157188d2cf2e3968faee3709ebeca28
diagram-tap-here-to-add-first = Stuknij tu, by dodać pierwszy element ({ $thing }).
# en: ccdb7bfa4c6b71a69f1931253fe6f892a2baf89b
diagram-tap-in-lane-to-add = Stuknij w torze, by dodać krok. Stuknij krok, by go edytować. Przeciągnij go na inny tor albo na krok, by następował po nim.
# en: 639d02ad26e5be80f5baf69835b953dfc015178b
diagram-tap-thing-to-join-name = Stuknij element, z którym połączyć { $name }. Stuknij puste miejsce, by anulować.
# en: 5d36f27a0649ac9ae67fb2e66f5be89ebc4719c8
diagram-tap-first-thing-to-join = Stuknij pierwszy element, potem drugi. Stuknij puste miejsce, by anulować.
# en: 8953058d46b225514231aca0b8643f4e72547676
diagram-this-thing = Ten element
# en: 53ea183a6bb5ad2942edd6884230b8f425c0eea6
diagram-add-under-it = Dodaj poniżej
# en: e9e7205b6f0bd7d9c8f1a1dfe85ef9d54979662f
diagram-add-one-more = Dodaj kolejny
# en: be34070c33b5c14155fe70a18891828387dd399d
diagram-add-after-it = Dodaj po
# en: 90d24ab49426f19e75a2b6c3fd9196603c2e0852
diagram-add-step = Dodaj krok
# en: e0d73143de80d17e82de2e017ac156ca3b9c4e01
diagram-join = Połącz
# en: e45795fb6033ae4ecc1e2e3610273fce71a317d7
diagram-make-it-plain-line = Zwykła linia
# en: 3a4758c3cc8dac2d76026d0733816741f9b21d43
diagram-make-it-arrow = Strzałka
# en: a07496767ed7e5caf20bb803434a1aa088aaa97b
diagram-what-connection-says = Etykieta połączenia
# en: 7d531617dd394cef59d3cf58fc32b3bc458f6744
diagram-who = Kto
# en: b48a4ad455ccc1431a4d3304864d95fb5de61df2
diagram-connection = połączenie
# en: ad87109bfff0765f4dd8cf4943b04d16a4070fea
diagram-empty = puste
# The templates
# en: 8b0bc4ee7e0e6e592c5e8812fef8883b9cbc66de
diagram-empty-kind-to-start-from = Zacznij od zera: { $kind }.
# en: cc9cfe196eaec8bbe041a0f648039cf31df71bc7
diagram-browser-api-database-cache-and = Przeglądarka, API, baza danych, pamięć podręczna i worker oraz jak ze sobą rozmawiają.
# en: 87796704431b42da8083f869f5ed707dae8cf8fe
diagram-building-project = Projekt budowlany
# en: 5accd00ffa799aafee66a6e2e7a77c3e89abdd38
diagram-launch-and-everything-that-branches = Premiera i wszystko, co z niej wychodzi: produkt, marketing, wsparcie.
# en: 9261260de34a3ec89f2846b1c6a53b8adc25bb35
diagram-package-through-store-warehouse-and = Paczka przez sklep, magazyn i kuriera, z jedną decyzją.
# en: 0ef1081dd660cc404f38216048590ca0999c05d2
diagram-small-company = Mała firma
# en: 6dea73ecffb81e3db543a664a3ba6e602d58683b
diagram-wedding-dinner = Kolacja weselna
# en: 1086ae322f0484af87b4a35b9537b35ad53ec68b
diagram-year-of-dates-from-plans = Rok dat, od zatwierdzonych planów po otwarcie drzwi.
# en: c75834baf2bd8482dbb5a822f4466908244e65fa
diagram-cats-and-dogs = Koty i psy
# en: 9e4600a93df1d0ffd290278244beed2111ac5cff
diagram-computing-briefly = Informatyka w skrócie
# en: 4944a571da52f0920a54f002e637dfc6e179603f
diagram-fast-cheap-good = Szybko, tanio, dobrze
# en: 77373004b00a68bf2cad476daa1ef0af2a7e26f0
diagram-four-tables-and-who-sits = Cztery stoły i kto przy którym siedzi.
# en: 1db47899ccb6eda1f1c46cee3c73acb1394c00ca
diagram-from-lovelace-to-now-spaced = Od Ady Lovelace do dziś, rozmieszczone w skali lat, z epokami u dołu.
# en: c973a2e43350a1c09697af1bd39a17f3cfba2c36
diagram-from-order-to-doorstep = Od zamówienia pod drzwi
# en: 91519d37fd9fe6f0c40b0429e0ed9f8eb8206006
diagram-from-job-description-to-yes = Od opisu stanowiska do „tak”, tor po torze.
# en: bfd1a142e965498fd2dbaa45ca87c1cbdc9071c9
diagram-grandparents-their-children-and-grandchildren = Dziadkowie, ich dzieci i wnuki, z latami.
# en: 347a51bd3c26ccac83baeca51966f318d5bb06c4
diagram-hiring-someone = Zatrudnianie kogoś
# en: f30d75896062b87258051feec53d9f7c05059037
diagram-how-app-hangs-together = Jak złożona jest aplikacja
# en: 70a97689961708e74a02157e6675bbcab893b7a4
diagram-seven-people-who-reports-to = Siedem osób, kto komu podlega, i jedna linia przerywana.
# en: 45ccf051d72194e5207999d9eeabaf9311e07ec2
diagram-garden-this-year = Ogród w tym roku
# en: 3fa0b6c790e0b44a046fe73aa9cf77f99106074d
diagram-three-generations = Trzy pokolenia
# en: 206f4033c4733b2b04a85ee0de9d35b1a5acc692
diagram-three-sets-and-every-overlap = Trzy zbiory i wszystkie ich części wspólne, z tym, co gdzie należy.
# en: 762ecdafab9b2868da1121459828ec245b03ac5e
diagram-two-sets-and-what-they = Dwa zbiory i to, co mają wspólnego.
# en: f02e532d172e25cb200306e2edda8e4331418dcd
diagram-what-to-grow-and-jobs = Co uprawiać i prace do zrobienia, jako mapa myśli.
# en: a6847567865dbe1e5266bbcd7f1f4e0049ee9eb1
diagram-biology-final-in-december-topic = Egzamin końcowy z biologii w grudniu, temat po temacie, i jak przebiega nauka.
# en: e32c422ee266430ea9dd0cd2cc78750a1342302a
diagram-classroom = Klasa
# en: e491ee6c30111d9c51d83d4a19aba47a3c39c769
diagram-family-with-godmother = Rodzina z matką chrzestną
# en: c164cf0f878062c2b43b69bf4c1de2c3d6a1f94d
diagram-principal-her-assistant-principals-classroom = Dyrektorka, jej zastępcy, wychowawcy klas i woźny.
# en: f25d2f240d3a52d5361d9b6dd4d8561290566159
diagram-move-to-lisbon-by-march = Przeprowadzka do Lizbony do marca: dokumenty, mieszkanie, praca i życie oraz co musi być pierwsze.
# en: d2586903dd907f55b8076edbe00b87f4e45ab92f
diagram-elementary-school = Szkoła podstawowa
# en: 3eff234615aa3d538d44f11142e266d62b44ef43
diagram-restaurant-kitchen = Kuchnia restauracji
# en: 3fecd5a70de57bb7748a775d7d4c6072bace1e50
diagram-router-and-everything-on-it = Router i wszystko, co jest do niego podłączone: laptop, telefon, drukarka, telewizor i dzwonek.
# en: 949c596fb3177561b6f2515cbc92b6b68a4292c2
diagram-team-by-its-skills-design = Zespół według umiejętności: projekt, pisanie i kod, i kto robi więcej niż jedno.
# en: eeb20483d989d9deef42a5ae150f171af0bc6201
diagram-expense-report = Rozliczenie wydatków
# same
# en: ded9774849cab88a3dd08936595ffe270dd397a2
diagram-apollo-11 = Apollo 11
# en: b5723994f111884ca2f9a82ecb525fb6992e44c8
diagram-board-game-night = Wieczór gier planszowych
# en: d69e423520fc900afc06f3d31ab286694fb7d67b
diagram-class-4b-at-four-tables = Klasa 4B przy czterech stolikach według koloru i kącik czytelniczy.
# en: d8d0862686b742040e32f8f3235084ad61fcef28
diagram-eight-days-in-july-1969 = Osiem dni w lipcu 1969, dzień po dniu, od startu do wodowania.
# en: ce31ba59543ea424a6019bc67976ace141d62d09
diagram-four-games-table-each-and = Cztery gry, po stole na każdą, i kto w co gra.
# en: 9d35a9836a6bb4c6180f6c2880c8c19c22ed4ea0
diagram-from-photo-of-receipt-to = Od zdjęcia paragonu do wypłaty, przez kierownika i dział finansów.
# en: 1f1489585228c4bf2d9599bdff9fef70f59b4a60
diagram-moving-abroad = Wyjazd za granicę
# en: a04755781fd967ec44d2f47f1ebf6ff83b2fe909
diagram-patrick-and-maria-their-six = Patrick i Maria, ich sześcioro dzieci z latami życia i ciotka, która je wychowała.
# en: 56aa5ec3b6a5e62a57ce1e1223c5f1f8148a7e02
diagram-studying-for-exam = Powtórka do egzaminu
# en: d7cda8e6bd3d07fe1968c61d6b068203911ae45c
diagram-sea-clouds-mountains-rivers-groundwater = Morze, chmury, góry, rzeki, wody gruntowe i rośliny oraz jak woda krąży między nimi.
# en: a1da7a04adf4a0189219b39bddb2518c44ba382f
diagram-brontes = Rodzeństwo Brontë
# en: 0c2311a818005e4508a11aa6a888f61a45bd9a3b
diagram-brigade-under-head-chef-front = Brygada pod szefem kuchni, obok niej sala.
# en: 0c62114de8628cfe00011bba9cc35f003279ac83
diagram-house-network = Domowa sieć
# en: 1fcf7cc436a073faa316df56cf1a4d3ec2b87d6e
diagram-water-cycle = Obieg wody
# en: cdb628c70ae8584f4098828ec8a65f19d44697b8
diagram-three-generations-of-morenos-and = Trzy pokolenia Morenów i linia przerywana do chrześniaka.
# en: 0e60bdf5cc3dbaa6c2018bd31c760c1e46e79ab1
diagram-who-can-do-what = Kto co potrafi
# en: b27a04f87f9d4657107a8dbd89d32eb1dedb41b7
diagram-tap-empty-space-for-branch = Stuknij puste miejsce, by dodać gałąź. Stuknij pomysł, by go edytować, Enter, by przejść do następnego. Przeciągnij jeden na drugi, by go zagnieździć. Połącz łączy dwa przez całą mapę.
# en: fd23500d007e121f9530bb8b530f367ed9e00825
diagram-place-cards = Winietki
# en: dd9ef7db14a8bdb18f7a266d6e91711443e71a29
diagram-print-place-cards = Drukuj winietki
# en: 030e26916d4c1d1ca0c41b3b447dde54ed891dbd
diagram-print-place-cards-card-guest = Drukuj winietki: winietka na gościa, osiem na arkusz letter, do wycięcia
# en: face83ee3014bdc8f98203cc94e2e89222452e90
diagram-guest = Gość
# en: 5734dbf560e03e0dea1a1bd85af5088238d5d0e4
diagram-new-idea = Nowy pomysł
# en: 32c6bde8aa4d539c3b773b1f4cf66e15aa427faa
diagram-tap-empty-space-for-person = Stuknij puste miejsce, by dodać osobę. Stuknij osobę, by ją edytować, Shift+Enter, by dodać rolę, Enter, by przejść do następnej. Przeciągnij jedną na drugą, by ją podporządkować.
# en: 5f7463cc9e2e8a2e25990127091710a286d9765a
diagram-tap-empty-space-for-event = Stuknij puste miejsce, by dodać wydarzenie. Wpisz datę, Shift+Enter, a potem co się stało. Daty są rozmieszczone w skali, a okres pokazuje się jako pas.
# en: b6395077670d276b6a207a6eadb6f5a17c1fa854
diagram-lanes-name = Nazwa toru
# en: 769bb19e615b7f8e2809e5882e2d05a18f57a531
diagram-when = Kiedy
# en: b23ea75ecf303b9756682c84abecebc7a010f2b1
diagram-tap-person-to-type-on = Stuknij osobę, by ją edytować. Wpisz + i imię partnera, Shift+Enter, by dodać lata, Enter, by przejść do następnej. Przeciągnij jedną na drugą, by ją podporządkować. Połącz rysuje linię kropkowaną.
# en: 14e56ce6d5f3d8d56d2ce979bf2eb20aaa9dd93d
diagram-tap-empty-space-for-table = Stuknij puste miejsce, by dodać stół. Stuknij stół albo osobę, by edytować. Przecinek zaczyna kolejnego gościa. Przeciągnij osobę do innego stołu.
# en: 7049f105f3a76be9cb8c6d7b74eb3edf60d9a7da
diagram-tap-inside-circles-to-add = Stuknij wewnątrz koła, by dodać element. Przecinek zaczyna kolejny. Stuknij nazwę zbioru, by ją zmienić. Przeciągnij element między kołami.

## the Trip Planner

# en: fdd91fbac0e5654a70026a229cc8a5d869157b24
trip-trip = podróż
# A stop is a place on the route; { $n } is its number, { $time } a drive such as "1 hr 38 min". 'Trip Planner' and 'Plan' are above.
# en: 46644fef83a4f92870b2bda5079d97dae8b05b1f
trip-route-on-map-stops-in = Trasa na mapie: przystanki po kolei, każdy z notatką, i jak daleko między nimi.
# en: 199cd6e4be673dbec0dfaaa645071e949f5480cc
trip-gpx-route = Trasa GPX
# same
# en: 97eeda258d4d0c87a81a7741038e625eda23a2a6
trip-geojson = GeoJSON
# The bar and the map
# en: 63746c80a9900aa0b9df832d6fe50b7318a88aab
trip-a-place-by-name = Miejsce po nazwie…
# en: c86d6e7640906afe6a57236c004f0b1af53b6ee8
trip-stop-at-middle-of-map = Dodaj przystanek na środku
# en: a52fccf0e1e5beca9d5885f1638d5e9a6a2684f9
trip-measure-in = Mierz w
# en: 2458f1444290ced8aefad04d5c947b17bf9a81fb
trip-hours-of-driving = Godzinach jazdy
# en: 5fa6c4032be31076212eb57f2fe6ba44d445d501
trip-miles = Milach
# en: 87bafdbb82c61625882d74515ef2c7e566177ea5
trip-kilometers = Kilometrach
# en: 8e49f86b47ba8e4ac259af7b5428623e7332489c
trip-join-stops-in-order = Połącz przystanki po kolei
# en: 7bdcf970899e9519b75f2dc24d1909f670b283cb
trip-show-whole-route = Pokaż całą trasę
# en: fa157c9ab413b3c415d7ada7457694a35c7869a1
trip-where-i-am = Gdzie jestem
# en: ab478f3efc840eebab919dff1b9512286f70c10c
trip-map = Mapa
# en: 4fa4643900d7a129558f6c34b681a8d419a9ef9d
trip-map-tap-to-add-stop = Mapa: stuknij, by dodać przystanek
# en: a481372d94c5d404a0bd0a597cda747c83e952a4
trip-map-comes-from-openfreemap = Kafelki mapy są wczytywane z OpenFreeMap, dopóki mapa jest otwarta.
# en: dd1ac7c6150bf40973c618ac841d01f2281dea20
trip-your-location-is-asked-for = Twoja lokalizacja służy tylko do wyśrodkowania mapy i nigdy nie jest przechowywana.
# en: 6c4827a34debc3c12e8a905f5e8025f0d22802cb
trip-n-stops = { $n ->
        [one] { $n } przystanek
        [few] { $n } przystanki
        [many] { $n } przystanków
       *[other] { $n } przystanku
    }
# en: 44896c642dce2a144eb35fdb61cedb762cc44ca1
trip-stop-n = Przystanek { $n }
# A stop's number is its handle; the bar under stops chosen whole.
# en: 372c19ab2c53f7582cdbe3823523a8760d0f2807
trip-stop-n-tap-chooses-it = Przystanek { $n }: stuknij, by zaznaczyć, przeciągnij, by przesunąć
# en: 56f844200d56e1fc382c81f28972a39aab61e019
trip-chosen-stops = Zaznaczone przystanki
# en: 0e648419ea806b0cc4db81617f95870a094f3639
trip-stops = Przystanki
# en: a9d55cf1a8a7b85ab9e293fc1e40a440986b0725
trip-show-on-map = Pokaż na mapie
# en: bdea0edfea6bebf4baf952432856faf7b3f43890
trip-name-of-stop-n = Nazwa przystanku { $n }
# en: 4dad38541848da253722328a5517dffdda35b4ab
trip-note-for-stop-n = Notatka do przystanku { $n }
# en: 0a8abf5522e2f20b1f976982533aabd909645324
trip-about-time-by-car = ok. { $time } samochodem
# en: 7f85e32db6c77473c8b172d1ad1dab75462705a3
trip-tap-map-to-add-first = Stuknij mapę, by dodać pierwszy przystanek, albo wstaw miejsce po nazwie.
# en: 472fd6a8979384a06de401f16cafb9cfdd9a824c
trip-insert-place-by-name = Wstaw miejsce po nazwie.
# Finding a place by name
# en: b75a19207f834200f4801a2db37886567baf25bc
trip-place-by-name = Miejsce po nazwie
# en: 7d7388a1d59910888c95c66fed24ad82cb5edbf2
trip-find-place = Znajdź miejsce
# en: 57d3470391ec96a8442196a4ff85cf39e4f65e98
trip-town-address-museum = Miasto, adres, muzeum
# en: bce06414177f72ab70e6387b6af9f8ceef0d6049
trip-search = Szukaj
# en: 1a6a5ba8c23ddb672874a2996abaee1fe933abcd
trip-searching = Wyszukiwanie…
# en: 07a4d61733e108a8ffa6e5753e09227b6a1a0f80
trip-searching-sends-words-you-type = Wyszukiwanie wysyła tylko to, co wpiszesz, do usługi Nominatim (OpenStreetMap).
# en: 2b36ec5f26fb5c35fccb5edd05776349d238b677
trip-places-found = Znalezione miejsca
# en: 6c70807e19d1f88aae7d66770719debbaf4ae89b
trip-nothing-found = Nic nie znaleziono.
# The templates
# en: ce482808305f25f4c7f63905061b0c411444f12c
trip-week-in-portugal = Tydzień w Portugalii
# en: 3a4002be5f16560bb462d3f37d8b2caac8a65603
trip-lisbon-to-porto-by-car = Z Lizbony do Porto samochodem, w kilometrach, wskazówka przy każdym przystanku.
# en: 72fa00e64f1816bfe62cd5e5ebae7ddd8bbc1d59
trip-down-pacific-coast = Wzdłuż wybrzeża Pacyfiku
# en: 6d871c8c9ed845cfaaafff0c18e335ce6da9ba42
trip-san-francisco-to-los-angeles = Z San Francisco do Los Angeles drogą Highway 1, w milach.
# en: 8396776ccda695ac7d6e5f12a1eaa4dd3edecfac
trip-scottish-highlands = Szkockie Highlands
# en: 7a3f06a64060636652afe5912e0a00016bc3d17f
trip-loop-from-edinburgh-each-leg = Pętla z Edynburga, każdy odcinek w godzinach jazdy.
# en: 9660e47a7aad398fbc88947cd22e8628b2a92115
trip-rome-places-to-see = Rzym, miejsca do zobaczenia
# en: f01c658cc1c5b1dbfba8045b885174d2f5a3d154
trip-places-as-dots-not-route = Miejsca jako kropki, nie trasa: co zobaczyć i kiedy jechać.
# en: e50e4931f42687faef4a226f93981bb38a937ce9
trip-weekend-in-copenhagen = Weekend w Kopenhadze
# en: 402e0be1180f76470536e904cec4f7242211bb15
trip-friday-night-to-sundays-train = Od piątkowego wieczoru do niedzielnego pociągu, pieszo, w kilometrach.
# en: a5594e90d42f49b6ce9e2842193b64f380d1a10c
trip-icelands-ring-road = Islandzka Ring Road
# en: b237aa87bc63dccebef93e19a8ef785d96ba69ce
trip-ten-days-around-island-by = Dziesięć dni dookoła wyspy samochodem, każdy odcinek w godzinach jazdy.
# en: 89059cee91b704cf1c0e42de4225df2968a207e7
trip-dublin-food-crawl = Kulinarny spacer po Dublinie
# en: b934fa6dfc063b38e47ce12ed4622e1cc0d55b75
trip-seven-places-to-eat-in = Siedem miejsc z jedzeniem w jedno popołudnie, z zachodu na wschód, a między nimi krótkie spacery.
# en: 2149c2c628bda1d9ea8522144f7ca59ce2a6bcc8
trip-yosemites-mist-trail-loop = Pętla Mist Trail w Yosemite
# en: 056b43a68d915001b02640fbb4ec910045a406ad
trip-two-waterfalls-on-day-hike = Dwa wodospady na całodniowej wycieczce z Happy Isles i z powrotem, w milach.
# en: b1365d430388f423cf7142e4a78c7470fed8a5fc
trip-loire-by-bike = Loara na rowerze
# en: e0fc4a0bf8e42cf48f5f6825bc3b8420df625254
trip-orleans-to-saumur-in-six = Z Orleanu do Saumur w sześć dni, od zamku do zamku, w kilometrach.
# en: e68d998a80765bfa302dd2b477f31c97db0d51d2
trip-college-tour = Zwiedzanie uczelni
# en: 02b9d4cf509b27e9011826d208a7831782bb08a6
trip-six-campuses-in-new-england = Sześć kampusów w Nowej Anglii w tydzień, na każdym zarezerwowane zwiedzanie.
# en: 651b0f889a962febf3a80370511cbc08abac73da
trip-japan-by-rail = Japonia koleją
# en: f687060ca9b759a7ed4bca61f7a2bf96764f2f8e
trip-tokyo-to-miyajima-in-cherry = Z Tokio do Miyajimy w czasie kwitnienia wiśni, pociągiem Shinkansen.
# en: afea6c128d27238aad4e11871dfff6f692334301
trip-last-100-km-of-camino = Ostatnie 100 km Camino
# en: 33d01f381424bbc8bbd1b6a9487b3a53c38d07e9
trip-sarria-to-santiago-on-foot = Z Sarrii do Santiago pieszo, etap dziennie.
# en: b15aca8406aa957e0b92331f3c94b96775672e6b
trip-new-york-in-movies = Nowy Jork w filmach
# en: cdd506e6983757bd11c62cbbe6a0acbbd4002303
trip-seven-film-and-tv-locations = Siedem lokalizacji filmowych i telewizyjnych, z Uptown do Downtown, w jeden dzień.
# en: 2cf068b9c859d837fbc257f1dc20a64d0d96b2b0
trip-wedding-on-lake-como = Wesele nad jeziorem Como
# en: a3dec1f6e3f5856eb26a70a9c329744d499a1afc
trip-for-guests-where-wedding-is = Dla gości: gdzie jest wesele, gdzie spać, jak dojechać.
# en: 0fbbb28a6e64acfee9300ecf05016dcf149a5a19
trip-presenting-trip = Prezentowanie podróży
# en: 24848d1e92a4b831f8fdae547c2fbfdc0d1e441b
trip-presenting-next-stop = Następny przystanek (prezentowanie)
# en: a802f6e93c981ee6dd02df366f0141ca3aa085e0
trip-presenting-stop-before = Poprzedni przystanek (prezentowanie)
# en: 3b14d20764a1fdef5ee74f4defab4ff20b0e7cce
trip-put-stops-on-calendar-day = Umieść przystanki w kalendarzu, po dniu na każdy
# en: 16fa5ad4958332a6bbb1eae6d1a8c6ee6f2c7752
trip-first-last = Pierwszy lub ostatni
# en: 0aa341109cff3c75e204930fdeac94f52278bb67
trip-next-stop = Następny przystanek
# en: 35bc0362a4899961a0e878990611c13021c1e549
trip-stop-before = Poprzedni przystanek

## shared: the Word Processor's looks, the header's Home, a money column's currency

# en: 958de540438a0fa530d47d2c072d0d9c22cd2af5
looks-typewriter = Maszyna do pisania
# en: a5c78a86fab1c02cd981c23b8bad5dad3e7438e3
looks-serif = Szeryfowy
# en: 70f8bb9a8a5393ef080507a89e4b98d139000d65
common-home = Strona główna
# en: e070de224434a2acd352b35cec46f34f9e08e1b2
looks-currency = Waluta

## the Calculator app

# en: a0015ec89d8034b2ca4a8f0219350514e19294a0
calc-calculation = obliczenie
# The tape is the list of lines worked out, as on a printing calculator. 'Calculator' and 'Numbers' are above.
# en: ab4ea6f8fe06812a128297560bee7aff1be0c040
calc-calculator-that-shows-its-work = Kalkulator, który pokazuje, jak liczy: nazwy, jednostki i przeliczenia oraz wykresy y = f(x).
# en: f146f8e93fc9312f6b8003b048cd24d1574469af
calc-tape-text = Taśma jako tekst
# The bar
# en: 9a7405ebcedde5be8d095a986ea8794e19ee84e2
calc-graph = Wykres
# en: a3310f1f9bbb12cd753850392faec8453a10c709
calc-clear-tape = Wyczyść taśmę
# en: 14a09e767bb648a339ba82fb609c02f3d9aa4228
calc-clear-graph = Wyczyść wykres
# Insert: functions, and what the second engine reads
# en: 2b961dea1dc0c60ddf9a2c8e9d090f6f7d082483
calc-functions = Funkcje
# en: ca0c5d6d0a40f5f2e6f47ee8fc8b934a3eece03f
calc-sine = Sinus
# en: c1951ad44359d27f765c0f1c7bfea678577a3fb1
calc-cosine = Cosinus
# en: 7ef1446b5f4ac08a82f28ef66bf019af3ed9c3c5
calc-tangent = Tangens
# en: f90781f1beba7ea766ef6fddf4672221c99da01f
calc-natural-log = Logarytm naturalny
# en: c4607860d3bb073b2fe96de25c2566b33f6e5610
calc-log-base-ten = Logarytm dziesiętny
# en: 47a3278f023594b94c900b5d792366be2e8b3d39
calc-square-root = Pierwiastek kwadratowy
# en: 35e4a1a9ace5e53c1521b13130f3b1fce0bb312b
calc-absolute-value = Wartość bezwzględna
# en: 8e4e872b30d442c4d7f1edf2cabdff971300b607
calc-factorial = Silnia
# en: c584662e0778e58334ec2e9f7fc7f58a98d4dca8
calc-e-number = e, liczba
# en: f3afae23c74a7d1a42a52c0c47bfeb1191b6b6e9
calc-x-for-graph = x, do wykresu
# en: 1cfd7bfc7d3d79d7ea28a91bdc6e032559103831
calc-units-and-algebra = Jednostki i algebra
# en: de1e4faaa9758db564ba458c3956824881efcd9c
calc-convert-to = Przelicz na
# en: 95562b515314072f0bc7658aa71f2ef77371d893
calc-derivative = Pochodna
# en: 965a00d9ba9665ad57ca3edefdcca07a61d3ca95
calc-simplify = Uprość
# The tape, the line being typed, the keys; { $answer } is a result such as 42 or 7.62 cm
# en: c51c55b719457118a73f5732f4dd4772aaba2e20
calc-tape = Taśma
# en: 1acb1c0448ace57b632dc2d56121f45a18e646be
calc-line-n = Wiersz { $n }
# en: 43885eadc7bc789d89e6e81db680818d2dd1b223
calc-put-answer-in-line = Wstaw { $answer }
# en: a9c16dd084ce3781568419133b0fa0c0f57aa727
calc-no-answer = Brak wyniku
# en: cf23123f857abeda1d28fc9b85cc7eba8d20f3b1
calc-take-away-line-n = Usuń wiersz { $n }
# en: fc9ce14b28c6f2c3b72caf056ca604b2b96f7d2b
calc-sum = Suma
# en: fdb6ecce95257d64ccde93310bf9a9adc8ad249e
calc-type-or-tap = Wpisz lub stuknij
# same
# en: e1745e3e21e84b24c379af6f45a18e1a21e56577
calc-y = y =
# same
# en: 97e60be18b1afcca3cde2fc6df4343208cefb0a1
calc-y-equals-ellipsis = y = …
# en: 71f2d6a97665cb72b50a6384a06af3e014b96db5
calc-at-x-1-answer = przy x = 1: { $answer }
# en: e5651c683f14c95aa972cfdbc300d9fecfe02019
calc-keys = Klawisze
# same
# en: 88d130a66de8e5db01660642d9f23e1f0eef97dd
calc-backspace = Backspace
# en: d1149c36a0edcfbeae98bf270da3f543b6c6a866
calc-clear-line = Wyczyść wiersz
# en: 097a41c8c7e58b9b655d7b3e31a3673466595450
calc-answer-before = Poprzedni wynik
# en: 2ee9e26d39d7113bd8fea80639d6257ab1bdf8cc
calc-type-sum-or-3-inch = Wpisz obliczenie albo 3 inch to cm i naciśnij Enter. a = 12 zapisuje wynik pod nazwą.
# en: 0bef86b24e006bd994db1509b268156522c7dc2c
calc-type-curve-in-x-such = Wpisz krzywą względem x, np. x^2 lub sin(x), i naciśnij Enter, by ją narysować.
# The templates
# en: bcb584ffecef3a17141a771a3ceedbbe6d474ca1
calc-splitting-bill = Podział rachunku
# en: 0a45fc60c975ea141733f982179ead17af8767b6
calc-food-drinks-and-18-tip = Jedzenie, napoje i 18% napiwku, na sześć osób, każdy krok zapisany pod nazwą.
# en: 2c9e678b58314997051ff2c13d56c92ea6bce7d7
calc-shopping-total = Suma zakupów
# en: d8719443b912bfaadd4f5d8fb2f1fc095f58ff52
calc-tape-of-market-apples-and = Taśma z targu: jabłka i ser na wagę, suma i reszta z 60 dolarów.
# en: 56d12d641f4f4177e63e120c8bd10a8e7348357f
calc-tax-on-price = Podatek od ceny
# en: 8a7d0a08d1e03c2974f84aa039e7871c5b232245
calc-new-york-city-sales-tax = Podatek od sprzedaży w Nowym Jorku dodany do ceny i odjęty od paragonu.
# en: 80296be8eee3142eb634c0045f82e15b5e5373aa
calc-percentage-change = Zmiana procentowa
# en: 93650e756cc879e41310d678219f483e5ce2cfd1
calc-rent-up-from-1-450 = Czynsz podniesiony z 1450 do 1595 dolarów: o ile, o ile procent i na tle podwyżki pensji.
# en: 9ff9fc7e0344944578d50820e0326f7bf34f1c8e
calc-kitchen-conversions = Przeliczanie w kuchni
# en: c7ccdb52f144fcec56adb8ecb5264f35d03600c0
calc-cups-ovens-spoons-and-weights = Szklanki, piekarniki, łyżki i ciężary, z jednej miary na drugą.
# en: 267b3d4696b05cc65039fcf4afb8cd9548ed5a29
calc-scaling-recipe = Skalowanie przepisu
# en: a0e9dcbc29ed1364a4891c3671dd43675af64d11
calc-banana-bread-for-eight-made = Chlebek bananowy z ośmiu porcji na dwanaście: każda ilość razy półtora.
# en: 8639704eb84800c829b41e6fcd833d686dcb41f6
calc-unit-conversions = Przeliczanie jednostek
# en: 2aef2060ccb74d32576f5b1f936372bdd97252f3
calc-feet-to-centimeters-miles-to = Stopy na centymetry, mile na kilometry, funty na kilogramy, Fahrenheit na Celsjusza.
# en: 7b31203b4780df1cd410c84049ed4d031dacc8e3
calc-currency-at-rate-you-type = Waluta po kursie, który wpiszesz
# en: 5f4e47693383fd619db1b39871b821a7fccf86df
calc-trip-priced-in-euros-and = Wyjazd wyceniony w euro i przeliczony na dolary, plus opłata za kartę.
# en: 6645ae7e46c209b7ba6f5fb3b6aa707395a2c3d2
calc-fuel-for-trip = Paliwo na wyjazd
# en: e2d3235c5cfd9ceffb4e54f0635e4f3841b0c0e1
calc-boston-to-montreal-and-back = Boston–Montreal i z powrotem: mile, mile na galon, cena, podział na cztery osoby.
# en: bb294d581aa3512dfdaf06cb5705338f026425ff
calc-paint-for-room = Farba do pokoju
# en: 8899142eaeb03e3a2cfc17f5e68f1977478e2ce5
calc-walls-less-door-and-windows = Ściany bez drzwi i okien, dwie warstwy, w puszkach po galonie.
# en: fa9aac4028931969e4e43d5926f21c1c02b03737
calc-time-zones = Strefy czasowe
# en: daa6b831387e404e18a932466e1b26486e942c1b
calc-one-call-at-9-in = Jedna rozmowa o 9 w Nowym Jorku i godzina w Londynie, Berlinie, Mumbaju, Tokio i Sydney.
# en: 4126383a0888802d508caf9f1e9a973554c6eb7e
calc-running-pace = Tempo biegu
# en: 73e59d9404aa7a32f2e7e9ae9ff609c2a74d14cb
calc-10k-in-52-30-minutes = 10 km w 52:30: minuty na kilometr i milę oraz półmaraton i maraton w tym tempie.
# en: d1411ae3cdd27fda5ea57577c408be223f586cf0
calc-body-mass-index = Wskaźnik BMI
# en: cf37a053ab6daf8527ff908a4479b6fb38654155
calc-weight-over-height-squared-in = Waga przez wzrost do kwadratu, w kilogramach i metrach albo w funtach i calach.
# en: 18c8c5aa1c31cb796ef6aa8086b794bc59e4d454
calc-dose-by-weight = Dawka według wagi
# en: a2cdd7739e2ff2b4f1ee78074c5c7981d1b877f9
calc-milligrams-kilogram-turned-into-milliliters = Miligramy na kilogram, zamienione na mililitry syropu; każdą dawkę sprawdź z farmaceutą.
# en: 4699da98e2d343e04aa2465082aedd4d5053aa11
calc-electricity-for-appliance = Zużycie prądu przez urządzenie
# en: d1b1126c73c13b523ce30bd2f563ad1a7b1c0210
calc-watts-hours-day-and-price = Waty, godziny dziennie i cena kilowatogodziny: ile miesięcznie kosztuje grzejnik.
# en: 96aeea666f6bd696d83ef3dee80fff1fcc3ff896
calc-loan-payment = Rata kredytu
# en: 9c2f158098b8fc30f79ae0d1db9391a68d8aea9a
calc-24-000-at-6-9 = 24 000 dolarów na 6,9% przez sześćdziesiąt miesięcy: rata miesięczna i łączne odsetki.
# en: 3c48bd272b7ad823e277ca649218ae107832bca4
calc-compound-interest = Procent składany
# en: ce79ef1a5e051c360028ef440ccc8258554abe0a
calc-5-000-and-200-month = 5000 dolarów i 200 dolarów miesięcznie przy 5% przez dziesięć lat, na tle tego, co wpłacono.
# en: 813161b07c2ed5cab82b09f8c31b3810800bcd26
calc-break-even = Próg rentowności
# en: bee9b48a097d165fe0d11f7c3a7175019c158c5e
calc-costs-against-sales-for-coffee = Koszty a sprzedaż wózka z kawą: punkt przecięcia linii to liczba kaw dziennie, której potrzeba.
# en: a9047269b4f64dbbb2df8503315406b2b33fc4e9
calc-curve-and-its-slope = Krzywa i jej nachylenie
# en: b5f43817a99082555a1fc4891fd2eb5bfaba6e10
calc-x3-3x-its-derivative-and = x³ − 3x, jej pochodna i płaska styczna na dnie dołka.
# en: d4802215f2c0025bd9e3f3fe025230ceda4e830b
calc-waves-adding-up = Sumujące się fale
# en: 9e46b2d75638fb2ebe905ad0c4be8059be6487cc
calc-sine-waves-summed-on-their = Sinusoidy zsumowane, w drodze do fali prostokątnej.
# The grip on a line of the tape; the bar under lines chosen whole.
# en: fd71cff4626f555a0e69c5b6801a591cabd1d173
calc-choose-line-n-drag-it = Zaznacz wiersz { $n }, przeciągnij, by przenieść
# en: dab2e3d9cf8c3bfccd20fa34fac6fc738ce9aba7
calc-chosen-lines = Zaznaczone wiersze

## two links compared (kit/ui/compare.ts)

# en: 8aa57de6dce6ee1c35c6aba7426503281876b258
compare-changes = Zmiany
# en: 8d105cf44d3926289e65c1c83d8e37cb23fd049e
compare-compare = Porównaj
# en: 24512a18bc6d2c27213ad28b26ce9271d94175af
compare-no-difference = Brak różnic
# en: 8f0fb2d2ece91d9de4ed64f23a12b475c3e18970
compare-not-link-to-tiny-little = To nie jest link do dokumentu Malutkiego Biureczka
# en: e82be1221a13b593fd3fd58ffe24f3c3ba58f783
compare-paste-second-link-to-see = Wklej drugi link, by zobaczyć, co się zmieniło.
# en: 442aef6fc360061295985657c4489b3c4d360cc3
compare-paste-link-to-document-as = Wklej link do dokumentu w obecnej postaci
# en: 7fb07fcb91ba19442009f16f24be4ef85b3eca16
compare-paste-link-to-document-as-it-was = Wklej link do dokumentu w dawnej postaci
# en: 0ae84aa126111ee639f685e9ed05c6895e632a90
compare-put-in = Dodano:
# en: 210dd62a81e43d19e22018878ba665485e0526cb
compare-swap = Zamień
# en: c331654dfaed937af3dc0e72f31b21fdfb1aa325
compare-taken-out = Usunięto:
# en: aec0a618ef67ca171ab77615fc7cab57405fea3f
compare-first-link = Pierwszy link
# en: 123bc4a6d63cd1415119c84ed21412a29ef9fbcc
compare-second-link = Drugi link
# en: 010030de6a30e85dd769e07201d8373ebff655c8
compare-two-links-to-documents-side = Dwa linki do dokumentów obok siebie: zaznaczono zmiany w drugim. Nic nie opuszcza tej strony.
# en: 2053662dff5d94e9ea30321321ce6cd0df8f0027
compare-different-apps = różne aplikacje
# en: f4e4b3a1d739ce43635eb9d75d97403c420c0642
compare-n-blocks-taken-out = { $n ->
        [one] { $n } blok usunięty
        [few] { $n } bloki usunięte
        [many] { $n } bloków usuniętych
       *[other] { $n } bloku usuniętego
    }
# en: 0041ce2f8795b8fbc93244ba17b668d115906ef3
compare-n-put-in = { $n ->
        [one] { $n } blok dodany
        [few] { $n } bloki dodane
        [many] { $n } bloków dodanych
       *[other] { $n } bloku dodanego
    }

## files and zips dropped on the page (kit/file/open.ts)

# en: c99db7abba3f7227854d93a163ad3494de4e1571
open-opened-name = Otwarto { $name }
# en: f917dee4211bd4af58db8efec79e354e1ffb4912
open-that-file-is-not-words = Malutkie Biureczko nie może odczytać tego pliku.
# en: 1d08903947cc83b648f8ad96b1e23466a2dbed11
open-that-file-is-too-large = Ten plik jest za duży.
# en: 8f432852569edbf7610713a6554e7a61396327d5
open-keep-them-on-this-device = Zapisz je na tym urządzeniu
# en: c4fe6d8b035f6108e8a7e0037667dacf3d6cca25
open-nothing-is-saved-on-this = Na tym urządzeniu nic nie jest zapisane. Zapisz je tutaj albo otwórz jeden z nich.
# en: 0826daee1d616f7de3a2b205eb2360fcaccc77ef
open-first = Otwórz pierwszy
# en: 59d36bf6c42ab3ae1481fe62abbc67ffef7a8b22
open-saving-in-this-browser-n = Zapisywanie w tej przeglądarce: { $n ->
        [one] { $n } dokument zachowany
        [few] { $n } dokumenty zachowane
        [many] { $n } dokumentów zachowanych
       *[other] { $n } dokumentu zachowanego
    }
# en: 4fc6621d5b53d413dd1fd42cf7e7834ee3ecba5a
open-that-zip-holds-no-documents = W tym pliku zip nie znaleziono dokumentów do odczytania.
# en: ed5d2e1ab481efa92392820d83922b25c236c730
open-n-documents-kept = { $n ->
        [one] { $n } dokument zachowany
        [few] { $n } dokumenty zachowane
        [many] { $n } dokumentów zachowanych
       *[other] { $n } dokumentu zachowanego
    }

## a document's QR code (kit/draw/qr-picture.ts)

# Restored around the document: search, Find in this document, the shortcuts and the apps' keys, Mod+S, the size of
# everything, Add to home screen, another version kept here, where the link fits, Open in another app, the QR code
# of this document, Insert narrowed by typing, Trip presenting, a seating chart's place cards
# en: 775db36d459744f2dc73dcb147ab032f4b6f4a09
qr-code-of-this-document = Kod QR tego dokumentu

## the keys, the shortcuts and the size of everything (kit/core/keys.ts, kit/ui/zoom.ts)

# en: e5737972ceac5c184d5009e9ee1746c4b3292f26
keys-normal-size = Resetuj powiększenie
# en: 4fc05f2763ba31e2d3be5f08e7d0bab5d5dcbf78
keys-everything-larger = Powiększ
# en: a4ae4b24a1f5369c2bff61abdbc221170e4b27d8
keys-everything-smaller = Pomniejsz
# en: 67312061f24800b7dc75b07101329959c5c1af88
keys-keep-this-document-on-device = Zapisz na tym urządzeniu
# en: 4d5e11a737e63d755f4127a0139f235f3794b6c6
keys-show-these-shortcuts = Pokaż te skróty
# en: da05037a43419e15395f52f0ed4dcb0c7f75c1f2
keys-this-page = Ta strona

## Find in this document (kit/ui/find.ts)

# en: 475c848673a3f79fa778f01c2bd5a721d4c41707
find-not-found = Nie znaleziono

## a menu narrowed by typing (kit/ui/menu.ts)

# en: a9c25fead588babdd6b90b343a47f716f722312e
menu-nothing-starts-q = Brak wyników dla „{ $q }”
# en: ddf17f8747a6b36489443d6b09c25b429a1ea675
menu-starting-q = Wyniki dla „{ $q }”


## who did what, listed for review beside a document several people write (kit/ui/review-panel.ts)

# en: 8aa57de6dce6ee1c35c6aba7426503281876b258
review-changes = Zmiany
# en: e6e3bb8760dfc9ea888b1967a09130f9c89fce15
review-none = Brak zmian do przejrzenia.
# en: 42e31dd677dc8b702293354c898041b64c77c442
review-put-in-for = Zamieniono „{ $took }” na „{ $put }”
# en: f328a19b27f5338a00f443da396faccd6d9030a1
review-put-in = Dodano „{ $words }”
# en: a67a3c5917ce7d2467dc22ea5d88e34d7c253b5b
review-took-out = Usunięto „{ $words }”
# en: 0a327a9ace030c351cd61b21a1eff225ff12941c
review-put-back = Przywrócono „{ $words }”
# en: 309250888492d1a0aaebb8f6920e9776a0c0dcaa
review-restyled = Sformatowano „{ $words }”
# en: be485cefbc9f51f3315136dd5bb07ea3fa8d04c0
review-put-in-line = Dodano wiersz
# en: 1f1fe15e0ff5fad870fa70dfa7d7c39cb13b807c
review-took-out-line = Usunięto wiersz
# en: 7f356b013fff2debeaa8414c985236bd05276b21
review-changed = Zmieniono dokument
# en: 92da3da547e5dd5677b18922b1611f08c61f4681
review-rejected-putting-back = Odrzucono zmianę i przywrócono „{ $words }”
# en: b10117b3632f96b6169864b190e3c106a212dc2a
review-rejected-taking-out = Odrzucono zmianę i usunięto „{ $words }”
# en: 30983f282a9a57909b378cd4134d143a067e0415
review-rejected-restyling = Odrzucono zmianę formatowania
# en: e235e19c7ec71b01d43fe842983f3a80c6212095
review-waiting = Czeka na Ciebie
# en: 6b94b0a9cbfbb2fc3ce5081c50246ab3016e4c73
review-yours = Twoje, czekają na pozostałych
# en: a90ec4fbb1f4f2050856da437722dada4ab986dc
review-reviewed = Przejrzane przez Ciebie
# en: 61a0572c4893ef34311320d84c82df88bea83e11
review-accepted = Zaakceptowano
# en: 27eeb7a291bfc566447d9cd928e98caf90f70ee6
review-rejected = Odrzucono
# en: 664b4269aeb67f403d95cde6c1d30eb3f135b08f
review-accepted-by = Zaakceptowano: { $names }
# en: 9e374afbcb1f0734401d4464d24993a8a3245d54
review-rejected-by = Odrzucono: { $names }
# en: 41b8f5693f30107a055b7507a7095b5ca0aa8fd9
review-n-waiting = { $n ->
        [one] { $n } czeka
        [few] { $n } czekają
        [many] { $n } czeka
       *[other] { $n } czeka
    }
# en: bb54db510a92908a5a4df79fc1ad1eae8df50ec3
review-accept = Zaakceptuj
# en: 2b03b59293b6fc7101306f5d9ae1e96327bb419a
review-reject = Odrzuć
# en: 821d1f7909a5146fa98fd5228675c49e64c6e60b
review-accept-all = Zaakceptuj wszystkie
# en: 35c291a4ab2f675bdb9437918790287fcfec88fa
review-reject-all = Odrzuć wszystkie
# en: 76cc08ef327763a9a7b47697d90d71a69acbed05
review-accept-all-by = Zaakceptuj wszystkie zmiany: { $name }
# en: 56db173f938aff6b5e405bb416ba178d4d344159
review-reject-all-by = Odrzuć wszystkie zmiany: { $name }

## comments beside a document's words (kit/ui/comments.ts, kit/ui/comment-box.ts)

# en: fce06e20e5f7f74aacccab40b59b75a56c8f7305
comments-comments = Komentarze
# en: af65ae0e9f04990618e53d608489530582356c11
comments-new = Nowy komentarz
# en: 207b24fc9b9276a4b2709de85e55eb8adbba3806
comments-none = Brak komentarzy.
# en: 4a88284dee66496310481a76d3d91ba0a1099aea
comments-select-words = Zaznacz słowa i wybierz Komentarz, aby coś o nich napisać.
# en: 570aad8456c6d9321e051c22879ae5833cf0cfde
comments-words-changed = Dotyczy zmienionych już słów
# en: 64d379f0d0c939707ccfbb7245f744611def8c96
comments-whole-document = Dotyczy całego dokumentu
# en: d999aeb0545fa93c44c82d1abb928c06e3590523
comments-resolved = Rozwiązane
# en: ac7f958cc028becfb4b2bec9c474bd2d5e8b6095
comments-resolve = Rozwiąż
# en: 61e05da2a47259dbae5eb58fad4b1af04dd69e07
comments-reopen = Otwórz ponownie
# en: 6c2bb735a46a8ff307fe2e638d581295b2a49e09
comments-reply = Odpowiedz
# en: 3a71e78cdb4d792bb688c8dbba093a0bda884647
comments-n-replies = { $n ->
        [one] { $n } odpowiedź
        [few] { $n } odpowiedzi
        [many] { $n } odpowiedzi
       *[other] { $n } odpowiedzi
    }
# en: 911d801f12b06712dee871fc5f647eacc04e430f
comments-by = Komentarze: { $name }
# en: 23b48bef02ad4d2437d3f19ab9df708fac256c00
comments-ask = Zapytaj: { $name }
# en: 9dd346ebb60f70ca00c786e8697e934709bf0a73
comments-asks = Pyta: { $name }
# en: 13ff50a2189f50a0c931f16e02b060b37ec0208e
comments-answering = { $name } odpowiada…
# en: b37554f695b15005fd23907b9488e0a8ad4bca5f
comments-people = Osoby
# en: 0f87ce5a3cbdf6796c6f152204e44b143201290f
comments-write = { $what }… @, by wskazać osoby

## a host's own pages: its table, its search, its header (kit/ui/table.ts, kit/ui/search-box.ts, kit/ui/header.ts)

# en: 4816c01fcfc82e618ba8d4f9f2d5cca84f36a4c1
table-filter-rows = Filtruj wiersze
# en: f648af13b3a158a514634b7a27501c621e4f9c87
table-add-row = Dodaj wiersz
# en: 45b553017087942f58e36f1963f58398aaa93cef
table-select-all-rows = Zaznacz wszystkie wiersze
# en: 9320afbefdcf309b4b763224769937b3936d517a
table-select-name = Zaznacz { $name }
# en: e892255d168b0ccc00b895b653a7ff8d9a7ab4f0
table-no-rows = Na razie nic tu nie ma
# en: 7dc03a2b77e86b5ce3279f1239cf7eed2c3e31dd
table-no-rows-match = Żaden wiersz nie pasuje
# en: fc6c0582fa83a05374d53d05a9e4fbd9a76f7adc
table-sort-hint = Sortuj według tej kolumny. Shift+kliknięcie, by sortować także według niej.
# en: c3cd636a585b20c40ac2df5ffb403e83cb2eef51
table-row-actions = Działania
# en: 0a35ecd2f44a46e9904bd46d91557748cc409ac8
table-actions-for-name = Działania dla { $name }
# en: ab5297fdaa47a693168d73de9b199b904eddba8d
table-no-records = Pisz, aby szukać
# en: bce06414177f72ab70e6387b6af9f8ceef0d6049
search-label = Szukaj
# en: 1a6a5ba8c23ddb672874a2996abaee1fe933abcd
search-searching = Wyszukiwanie…
# en: 938206ae8c35210570eff0f625f7174736ab50d3
search-failed = Wyszukiwanie nie powiodło się. Spróbuj ponownie.
# en: 445b04c118dbe3becf81b1490e4f09218cd85a09
search-n-found = { $n ->
        [one] { $n } wynik
        [few] { $n } wyniki
        [many] { $n } wyników
       *[other] { $n } wyniku
    }
# en: 1c8d7da8241f46e35847a6ee94585aa15c895038
search-nothing-found = Brak wyników dla „{ $q }”
# en: 0ecef6f95577e3e82d8917d2d3e89d1aa83afd09
header-breadcrumbs = Ścieżka nawigacji
# en: 4cebf6eb94e9c19167d02308623d15bc597b63cd
template-picker-all-apps = Wróć do aplikacji
# en: 3dfae1ccc665881b5464634d32ae1c7a301ac757
field-edit-name = Edytuj: { $name }

## the Board

# en: e879b0be0190766af9d315adbc46dcd7314f0b3f
board-board = Tablica
# en: 9ea5e97d2f481d5427902c67e55a54ec377e4761
board-board-lowercase = tablica
# en: d1b387380c728b48ad48dad8e820910a5b9823d8
board-cards-in-lanes-by-status = Karty w kolumnach według statusu, każda karta to wiersz tabeli.
# same
# en: bae7d5be70820ed56467bd9a63744e23b47bd711
board-status = Status
# en: 8665aed3624f4916345a2b028d6d28d352ad4245
board-to-do = Do zrobienia
# en: 9f1ffa416cd0e63113fa0244f18e15e1a1079c18
board-doing = W toku
# en: e9b450d14bc2363d292c84f17cfad5cfbd58a458
board-done = Gotowe
# en: cf5fbf174610c73177abf9c8651380a7704db1bd
board-no-cards = Brak kart
# en: 0463e9010e415ef45e74451772c13dbd858b5db4
board-n-cards = { $n ->
        [one] { $n } karta
        [few] { $n } karty
        [many] { $n } kart
       *[other] { $n } karty
    }
# en: ec6f345f456be5e906efb61c1bd7cc91fbe8c3d6
board-open-cards-in-spreadsheet = Otwórz karty w arkuszu kalkulacyjnym
# en: 4d4ce73b15660f20977ad7efab2283c51bdae008
board-card = Karta
# en: 8ccf7349a24f44599bb594439759d55772afee20
board-lane = Kolumna
# en: 19ccf26dc8e702d98d74975dc1be88ac35befe92
board-lane-options = Opcje kolumny
# en: 7f51ca5da34a388508ed9fc5f8ac44c5562f5173
board-options-for-lane = Opcje kolumny { $lane }
# en: 5e8cce6827d0497950b63c967f9543df9fa8b1a4
board-add-card = Dodaj kartę
# en: 9b16c4bcc3877580d2535eb47b42650501308935
board-delete-lane = Usuń kolumnę
# en: c0a3ef619ab093df30dca80bc872eedfe5850b52
board-move-to = Przenieś do…
# en: 7b4bff0cec6d8f2a2abd46cfaa219d8214122ca1
board-rename-lane = Zmień nazwę kolumny
# en: 79b66240efe711f91cce563f1d617c7c4e6f5455
board-narrow-lane = Zwęź kolumnę
# en: 4b56664ff2a4f5e3664a8a72c81014417656228d
board-widen-lane = Poszerz kolumnę
# en: 989daa44bce2c13fd826839f682b673c2ba00556
board-collapse-lane = Zwiń kolumnę
# en: 44ffae7e426c6c6cb6e36b7913029f4bd286eff5
board-expand-lane = Rozwiń kolumnę
# en: cf6dc32236a1e2d47ecd9b400ed36569290b3a78
board-lane-color = Kolor kolumny…
# en: 1d5c5b44886211206754a909bcf3b856de371f32
board-no-color = Bez koloru
# en: 27a01d4772038a3f83552908e0470604e773f8af
board-amber = Bursztynowy
# en: ddcd2f2e783a0ee9fa8d93732423a0504c651596
board-violet = Fioletowy
# en: df0ad373b7ff60d6a8987458fb00c1e4832ef605
board-teal = Morski
# en: 4f9beff18cc6852b012093ba97421788466bb3bf
board-gray = Szary
# en: a5912ab4a43981f406eba8185371c4b3651e648b
board-card-in-lane-beside = Sąsiednia karta w poprzedniej lub następnej kolumnie
# en: a200dd9231cf71181960586345e66a1b8bb3e738
board-move-card-to-lane-before-or = Przenieś kartę do poprzedniej lub następnej kolumny
# en: f801223b1d000f42a1e7f02ec5f078e77efbbea4
board-lane-name = Nazwa kolumny
# en: 4a1eabde691b377e61e564f2b21a56ce7c48f862
board-lane-needs-a-name = Kolumna musi mieć nazwę.
# en: f2eaf2b4b185176968749b50d7028a1c89357026
board-lane-name-taken = Kolumna o nazwie { $lane } już istnieje.
# en: d1bef7e304cff6b5048ede1892d1cc9c4307b7fd
board-double-click-to-rename = Kliknij dwukrotnie, aby zmienić nazwę
# en: 141ee07375861e5bb346745bbb11f74b0fcee117
board-double-tap-to-rename = Stuknij dwukrotnie, aby zmienić nazwę
# en: b0979c4915315a19ae77b53a28bf2ff42ac97034
board-add-lane = Dodaj kolumnę
# en: c6196faeecf27e09514f0812df5e4b0f18a49465
board-lane-total = Razem { $sum }
# en: d3f8f7b810c4b08f0b4ac4e47fdf8d265a10d869
board-yyyy-mm-dd = RRRR-MM-DD
# en: a0cb8ea4060e4a90b3f78592285740f7da401615
board-new-lane = Nowa kolumna
# en: 8bd7cc004028fed2c431bef5632a5f52a14e1af6
board-title-of-card-n = Tytuł karty { $n } w { $lane }
# en: bc2748da58d80b5c56727fe18421e38b112a5ae5
board-card-n-tap-chooses-it = Karta { $n } w { $lane }: stuknij, by zaznaczyć, przeciągnij, by przesunąć
# en: 810b76bb164a844386d1a2e79fd6f0580914a82f
board-chosen-cards = Zaznaczone karty
# en: 485f5f8bdd8f8be4ce2ca76e2531a5d8114df337
board-project-board = Tablica projektu
# en: c1781d58aa2f45b844d09310320a3910191ad880
board-to-do-doing-done-owner = Do zrobienia, w toku i gotowe, każde zadanie z osobą odpowiedzialną i terminem.
# en: df5ed7c968260c1206d4e522066460822cf75b92
board-sales-pipeline = Lejek sprzedaży
# en: e8005f76e068a5cac180467fb97ac33561c72f62
board-deals-from-inbound-to-won = Transakcje od zgłoszenia do wygranej lub przegranej, z wartością i datą zamknięcia.
# en: 9ce5d6326186a71d12527fe2a55a6ba56518e0ef
board-hiring = Rekrutacja
# en: 9fe2a35ad36e6e3d1a54f763c65f2dabd3ad62f9
board-candidates-from-application-to-hire = Kandydaci od zgłoszenia do zatrudnienia, ze stanowiskiem i kolejnym krokiem.
# en: d52515f227f638ad6d968486abebc20d6729d8c6
board-content-calendar = Kalendarz treści
# en: 0f84e77fda32b99ff2b28eebd7adca162dcf5f93
board-pieces-from-idea-to-published = Materiały od pomysłu do publikacji, z kanałem, autorem i datą.
