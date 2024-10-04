// ==UserScript==
// @name         DLsite关键词替换（优化版）
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  在DLsite网站上替换特定关键词，支持简繁体自动切换
// @match        *://*.dlsite.com/*
// @icon         https://www.dlsite.com/images/web/common/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let replaceCount = 0;
    let originalTexts = [];
    let isReplacing = true;
    let isSimplified = true;

    const replacements = {
        tags: {
            '秘密さわさわ': ['痴汉', '痴漢'],
            '强行': ['强制', '強制'],
            '兽X': ['兽奸', '獸姦'],
            '暗示': ['催眠', '催眠'],
            '机械X': ['机械奸', '機械姦'],
            '异种X': ['异种奸', '異種姦'],
            '精神支配': ['洗脑', '洗腦'],
            '强X': ['强奸', '強姦'],
            '超ひどい': ['鬼畜', '鬼畜'],
            '造孽': ['鬼畜', '鬼畜'],
            '萝': ['萝莉', '蘿莉'],
            '教育': ['调教', '調教'],
            '奴仆': ['奴隶', '奴隸'],
            '近親もの': ['近親相姦', '近親相姦'],
            '骨科': ['近親相姦', '近親相姦'],
            '下僕': ['奴隷', '奴隸'],
            '强制/無理矢理': ['命令/無理矢理', '命令/無理矢理'],
            'ボクっ娘': ['男の娘', '男の娘'],
            '男性自称少女/仆娘': ['男娘', '男娘'],
            'しつけ': ['調教', '調教']
        },
        content: {
            '催[〇○◯]': ['催眠', '催眠'],
            '痴[〇○◯]': ['痴汉', '痴漢'],
            '陵[〇○◯]': ['凌辱', '凌辱'],
            '凌[〇○◯]': ['凌辱', '凌辱'],
            '强[〇○◯]': ['强制', '強制'],
            '強[〇○◯]': ['強制', '強制'],
            'レ[〇○◯]プ': ['レイプ', 'レイプ'],
            '輪[〇○◯]': ['輪姦', '輪姦'],
            '轮[〇○◯]': ['轮奸', '輪姦'],
            'メ[〇○◯]ガ': ['メスガ', 'メスガ'],
            'せ[〇○◯]リ': ['せなリ', 'せなリ'],
            'J[〇○◯]': ['JK', 'JK'],
            '[〇○◯]K': ['JK', 'JK'],
            '近親相[〇○◯]': ['近親相姦', '近親相姦'],
            '強[〇○◯]発情': ['强制発情', '強制発情'],
            'ち[〇○◯]ぽ': ['ちんぽ', 'ちんぽ'],
            'ま[〇○◯]こ': ['まんこ', 'まんこ'],
            '睡眠[〇○◯]': ['睡眠姦', '睡眠姦'],
            '[〇○◯]リ': ['ロリ', 'ロリ'],
            '奴[〇○◯]': ['奴隶', '奴隸'],
            '[〇○◯]女': ['少女', '少女'],
            'ロ[〇○◯]': ['ロリ', 'ロリ'],
            '孤[〇○◯]院': ['孤儿院', '孤兒院'],
            '[〇○◯]サクヤ': ['反サクヤ', '反サクヤ'],
            '[〇○◯]学生': ['小学生', '小學生'],
            '年[〇○◯]': ['年若', '年輕'],
            '犯[〇○◯]れ': ['犯され', '犯され'],
            '监[〇○◯]': ['监禁', '監禁'],
            '監[〇○◯]': ['監禁', '監禁'],
            'モブ[〇○◯]などなど': ['モブ姦などなど', 'モブ姦などなど'],
            'お[〇○◯]ん': ['おまん', 'おまん']
        }
    };

    function createFloatingUI() {
        const ui = document.createElement('div');
        ui.id = 'keyword-replace-ui';
        ui.style.cssText = `
            position: fixed;
            right: 0;
            top: 50%;
            background-color: rgba(173, 216, 230, 0.7);
            padding: 5px;
            border-radius: 5px 0 0 5px;
            cursor: move;
            user-select: none;
            z-index: 9999;
            width: 45px;
            height: 45px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-size: 14px;
            text-align: center;
            line-height: 1.2;
            font-family: "黑体", sans-serif;
            font-weight: bold;
        `;
        updateUIContent(ui);

        let isDragging = false;
        let startY;
        let startTop;

        ui.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startTop = ui.offsetTop;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const newTop = startTop + e.clientY - startY;
                ui.style.top = `${newTop}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        ui.addEventListener('click', toggleReplacement);

        document.body.appendChild(ui);
        return ui;
    }

    function updateUIContent(ui) {
        ui.innerHTML = isReplacing ?
            `替换<br>${replaceCount}次` :
            `关闭<br>替换`;
    }

    function toggleReplacement() {
        isReplacing = !isReplacing;
        const ui = document.getElementById('keyword-replace-ui');
        if (isReplacing) {
            replaceAllText();
        } else {
            undoReplacements();
        }
        updateUIContent(ui);
    }

    function replaceText(node, replacementType) {
        if (node.nodeType === Node.TEXT_NODE) {
            const originalText = node.textContent;
            let text = originalText;

            for (let [key, value] of Object.entries(replacements[replacementType])) {
                text = text.replace(new RegExp(key, 'g'), isSimplified ? value[0] : value[1]);
            }

            if (replacementType === 'content') {
                // 特殊规则：如果"强[〇○◯]"后面没有中文、日文或为空，替换为"强奸"/"強姦"
                text = text.replace(/强[〇○◯](?![ぁ-んァ-ン一-龯\u4e00-\u9fa5]|$)/g, isSimplified ? '强奸' : '強姦');
            }

            if (text !== originalText) {
                originalTexts.push({node: node, text: originalText});
                node.textContent = text;
                replaceCount++;
                updateUIContent(document.getElementById('keyword-replace-ui'));
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (let child of node.childNodes) {
                replaceText(child, replacementType);
            }
        }
    }

    function replaceAllText() {
        replaceCount = 0;
        originalTexts = [];
        document.querySelectorAll('.main_genre a').forEach(node => replaceText(node, 'tags'));
        replaceText(document.body, 'content');
    }

    function undoReplacements() {
        while (originalTexts.length > 0) {
            const {node, text} = originalTexts.pop();
            node.textContent = text;
        }
        replaceCount = 0;
        updateUIContent(document.getElementById('keyword-replace-ui'));
    }

    function observeChanges() {
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                for (let node of mutation.addedNodes) {
                    if (isReplacing) {
                        if (node.nodeType === Node.ELEMENT_NODE && node.matches('.main_genre a')) {
                            replaceText(node, 'tags');
                        } else {
                            replaceText(node, 'content');
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function checkLanguage() {
        const langSelector = document.querySelector('.header_dropdown_nav_Link.type_language_top i');
        isSimplified = langSelector && langSelector.textContent.includes('简体中文');
    }

    // 创建UI
    createFloatingUI();

    // 检查语言并设置isSimplified
    checkLanguage();

    // 初始替换
    replaceAllText();

    // 监听动态变化
    observeChanges();
})();
