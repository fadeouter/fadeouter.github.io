document.addEventListener('DOMContentLoaded', (event) => {
    init();
});

function init() {
    setupEventListeners();
    checkURLParams();
    loadPreviousData();
    setCaretAtStart();
    genSlides();
}

function setupEventListeners() {
    document.getElementById('md').addEventListener('input', debounce(genSlides, 300));
    document.addEventListener('keydown', handleKeyEvents);
}

function debounce(func, delay) {
    let timer;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, arguments);
        }, delay);
    };
}

function checkURLParams() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const externalUrl = urlParams.get('file');
    
    if (urlParams.has('file')) {
        fetchFile(externalUrl);
        window.history.replaceState({}, document.title, "/slides");
    } 
}

function fetchFile(file) {
    fetch(file)
        .then(response => response.text())
        .then(result => document.getElementById('md').value = result)
        .finally(() => {
            setTimeout(genSlides, 1000);
            setCaretAtStart();
        });
}

function markdownToHtml(md) {
    const renderer = new marked.Renderer();

    marked.Renderer.prototype.paragraph = (md) => {
        if (md.startsWith("<img")) {
            return md + "\n";
        }
        return "<p>" + md + "</p>";
    };

    return marked(md, { renderer });
}

function scrollToSlide() {
    var mql = window.matchMedia("(orientation: landscape)");
    if (mql.matches) {
        var textArea = document.getElementById("md")
        var md = textArea.value

        var cursorPosition = textArea.selectionStart
        var textSlice = md.slice(1, cursorPosition)
        var slideNumber = textSlice.split("\n---").length

        var SlideToScroll = document.querySelector('.slide' + slideNumber);

        if (SlideToScroll) {
            var slideoffsetHeight = (SlideToScroll.offsetHeight / 2.5);
            const y = SlideToScroll.offsetTop - slideoffsetHeight;
            var e = document.getElementById('slides-container')

            setTimeout(() => {
                e.scrollTo({
                    top: y,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }
}

function genSlides() {
    scrollToSlide();
    var date = Date.now();
    const textArea = document.getElementById("md");
    var md = `\n${textArea.value}`; // фикс, чтобы функция подсчёта блоков не считала на 1 блок меньше в первом слайде
    var version = { date, md };
    localStorage.setItem('current', JSON.stringify(version));

    var arr = md.split("\n---"); // разделение текстового контента на слайды
    const slides = document.getElementById("slides-container");
    slides.textContent = ''; // очистка предыдущих слайдов

    // скрипт обработки слайдов
    arr.forEach((mdSlide, index) => {
        index++;
        // определим кол-во заголовков для лупа обработки
        var count = (mdSlide.split(/\n#### |\n### |\n## |\n# |\n\[QR\]|\n!\[/).length);
        // console.log('Заголовков в слайде ' + index + ': ' + count)
        var wrappedMDSlide = mdSlide;
        let htmlContentBlock = '';

        // если блоков больше 2 (> заголовок + блок)
        if (count > 2) {
            for (let i = 1; i < count; i++) {
                // скрипт проходится нужное кол-во раз по слайду и находит блоки
                var foundBlock = wrappedMDSlide.match(/(\n# |\n## |\n### |\n#### |<img|\[QR\]|\n!\[)(.*?)((?=\n# )|(?=\n## )|(?=\n### )|(?=\n#### )|(?=<img)|(?=\n!\[)|(?=\[QR)|$)/s);
                // проверяем, содержит ли блок QR-код и решаем, генерируется ли QR-код или нормальный md2html
                var QRtest = /(\n\[QR\]|\[QR)/.test(foundBlock[1]);
                
                let htmlBlock;
                if (QRtest) {
                    var foundCode = foundBlock[2].match(/\((.*?)\)/);
                    var afterCode = foundBlock[0].match(/(?!.*\)).+/g) || [''];
                    
                    if (!Array.isArray(afterCode)) {
                        afterCode = [afterCode];
                    }
                
                    htmlBlock = `<div class="qrcode qr${index}_${i}" data-qr="${foundCode[1]}"></div>${markdownToHtml(afterCode.join('\n\n'))}`;
                } else {
                    htmlBlock = markdownToHtml(foundBlock[0]);
                }

                // оставшийся контент обособляется во wrappedMDSlide
                wrappedMDSlide = wrappedMDSlide.replace(foundBlock[0], '');
                htmlContentBlock += `<div class="block block${i}">${htmlBlock}</div>\n\n`;
            }
        } else {
            // если только 1 блок
            var titleBlockSearch = /#.*?.\n(.*\n){1}/;
            // регексп находит блок с заголовком и подзаголовком
            var titleBlock = wrappedMDSlide.match(titleBlockSearch);
            var foundBlock = wrappedMDSlide.match(/(\n# |\n## |\n### |\n#### |<img|\[QR\]|\n!\[)(.*?)((?=\n# )|(?=\n## )|(?=\n### )|(?=\n#### )|(?=<img)|(?=\n!\[)|(?=\[QR)|$)/s);

            if (foundBlock) {
                var foundCode = foundBlock[2].match(/\((.*?)\)/);
                var afterCode = foundBlock[0].match(/(?!.*\)).+/g) || '';
            }

            let htmlBlock;
            if (foundBlock && foundCode && foundBlock[1].match(/(\n\[QR\]|\[QR)/)) {
                htmlBlock = `<div class="block block-single noTitle qrcode qr${index}_${i}" data-qr="${foundCode[1]}"></div>${markdownToHtml(afterCode.join('\n\n'))}`;
            } else {
                htmlBlock = `<div class="block block-single noTitle">${marked(mdSlide)}</div>\n\n`;
            }

            if (titleBlock) {
                // регексп вырезает из текста заголовок и подзаголовок
                mdSlide = wrappedMDSlide.replace(titleBlockSearch, '');
                let lines = (mdSlide.match(/^\s*\S/gm) || "").length;

                htmlContentBlock = (lines > 0) 
                    ? `<div class="block block-title">${marked(titleBlock[0])}</div>\n<div class="block-content">${marked(mdSlide)}</div>\n\n`
                    : `<div class="block block-single withTitle">${marked(titleBlock[0])}</div>\n`;

            } else {
                htmlContentBlock = htmlBlock;
            }
        }

        let slideContainer = document.createElement('div');
        slideContainer.classList.add(`slide${index}`, 'slide');
        slideContainer.innerHTML = htmlContentBlock;

        let slideWrapper = document.createElement('div');
        slideWrapper.classList.add(`wrapper${index}`, 'wrapper');
        let wrapperContent = `
            <div class="slide-num notonpresent">${index}</div>
            <div class="slide slide${index}" onClick="slideNextRect(event)">${htmlContentBlock}</div>
            <div class="slide-menu notonpresent">
                <div class="play" onClick="present(${index})">▷<span>Start</span></div>
                <div class="download" onClick="downloadSlide(${index})">↓<span>Download</span></div>
            </div>`;
        slideWrapper.innerHTML = wrapperContent;
        slides.appendChild(slideWrapper);
    });

    createQRCodes();
}

function createQRCodes() {
    var slides = document.getElementById("slides-container");
    var qrcodes = slides.getElementsByClassName('qrcode');

    for (var i = 0; i < qrcodes.length; i++) {
        var qrcode = QRCode({
            msg: qrcodes[i].dataset.qr,
            pad: 0,
            dim: 1200,
            pal: ["#222", "#FFF"]
        });
        qrcodes[i].appendChild(qrcode);
    }
}

function loadPreviousData() {
    const prevVersion = localStorage.getItem('current');
    let savedText = JSON.parse(prevVersion);

    if (!savedText) {
        fetchFile('https://gleb.li/slides/demo.md');
    } else {
        document.getElementById("md").value = savedText.md;
    }
}

function setCaretAtStart() {
    var c = document.getElementById("md");
    c.focus();
    c.setSelectionRange(1, 1);
}

function handleKeyEvents(e) {
    if (document.querySelector('body').classList.contains('present')) {
        if (e.keyCode === 39 || e.keyCode === 40 || e.keyCode === 32) {
            slideNext(1);
        } else if (e.keyCode === 37 || e.keyCode === 38) {
            slideNext(0);
        } else if (e.keyCode === 27) {
            exit();
        }
    } else {
        if (e.keyCode === 39 || e.keyCode === 40 || e.keyCode === 37 || e.keyCode === 38) {
            scrollToSlide();
        }
    }
}

// старт слайдшоу
function present(slide) {
    activeSlideNum = slide - 1;
    document.querySelector('body').classList.toggle('present');
    document.querySelector(`.slide${slide}`).classList.add('presented');
    document.documentElement.requestFullscreen();
}

function exit() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
        activeSlideNum = 0;
    }
    var slides = document.getElementsByClassName("slide");
    for (let i = 0; i < slides.length; i++) {
        slides[i].classList.remove('presented');
    }
    document.querySelector('body').classList.toggle('present');
}

function slideNext(next) {
    toggleSlide(next ? 1 : -1);
}

function toggleSlide(num) {
    var slides = document.getElementsByClassName("slide");
    if (slides[activeSlideNum + num]) {
        slides[activeSlideNum].classList.remove('presented');
        slides[activeSlideNum + num].classList.add('presented');
        activeSlideNum += num;
    }
}

function slideNextRect(event) {
    const slideElement = document.querySelector('.presented');
    const boundingRect = slideElement.getBoundingClientRect();
    const clickX = event.clientX - boundingRect.left;
    const halfWidth = boundingRect.width / 2;


if (clickX <= halfWidth) {
    toggleSlide(-1); // назад
} else {
    toggleSlide(1); // вперёд
}}

function toggleSlideSize() {
    document.body.classList.toggle('toggleSlideSize');
}

// экспорт
function downloadAll() {
    var slideWidth = document.getElementsByClassName('slide1')[0].offsetWidth;
    var scaleIndex = (1920 / slideWidth);
    var doc = new jsPDF('l', 'px', [1920, 1080]);

    (async function loop() {
        var pages = document.getElementsByClassName("slide");
        document.getElementById('downloadbtn').classList.add('generating');

        for (var i = 0; i < pages.length; i++) {
            await new Promise(function (resolve) {
                html2canvas(pages[i], {
                    scale: scaleIndex,
                    useCORS: true
                }).then(function (canvas) {
                    var slideImg = canvas.toDataURL('image/jpeg', 0.95);
                    doc.addImage(slideImg, 'JPEG', 0, 0, 1922, 1082);

                    if ((i + 1) == pages.length) {
                        doc.save('slides.pdf');
                        document.getElementById('downloadbtn').classList.remove('generating');
                    } else {
                        doc.addPage();
                    }
                    resolve();
                });
            });
        }
    })();
}

function downloadSlide(number) {
    var slideWidth = document.getElementsByClassName('slide' + number)[0].offsetWidth;
    var scaleIndex = (1920 / slideWidth);

    var slideClass = '.slide' + number;
    var slideElement = document.querySelector(slideClass);
    slideElement.classList.add('scaled');

    html2canvas(slideElement, {
        scale: scaleIndex,
        useCORS: true
    }).then(canvas => {
        canvas.toBlob(function (blob) {
            saveAs(blob, number + '.png');
        });
    });

    slideElement.classList.remove('scaled');
}

function downloadTxt(extension) {
    var text = document.getElementById('md').value;
    var name = text.slice(0, 25).replace(/[#|\n]/g, '');
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    saveAs(blob, 'Slides —' + name + '.' + extension);
}

// темы
function toggleClass(className) {
    if (document.body.className !== className) {
        document.body.className = '';
    }
    document.body.classList.toggle(className);
    if (document.body.className !== className) {
        document.body.className = '';
        localStorage.setItem('theme', 'light');
    } else {
        localStorage.setItem('theme', className);
    }
}

function toggleTheme(theme) {
    var slides = document.getElementById("slides-container");
    slides.className = '';
    slides.classList.toggle(theme);
    localStorage.setItem('font', theme);
}

function toggleMenu() {
    document.getElementsByClassName("nav-submenu")[0].classList.toggle('nav-submenu_visible');
}

document.addEventListener('click', function (e) {
    if (document.getElementsByClassName("nav-submenu")[0].classList.contains('nav-submenu_visible') && !e.target.classList[0].startsWith('nav-')) {
        document.getElementsByClassName("nav-submenu")[0].classList.toggle('nav-submenu_visible');
    }
});

// исходные настройки
var savedFont = localStorage.getItem('font');
if (!savedFont) {
    toggleTheme('Wide');
} else {
    toggleTheme(savedFont);
}

var savedTheme = localStorage.getItem('theme');
if (!savedTheme) {
    toggleClass('light');
} else {
    toggleClass(savedTheme);
}