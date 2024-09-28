/* eslint-disable no-new */

(async () => {
  // 获取本地化字符串
  const lang = str => chrome.i18n.getMessage(str)

  // 加载菜单
  const newDiv = document.createElement('div')
  newDiv.innerHTML = `
<div class="prompt-menu-sidebar">
    <button class="prompt-menu-toggle-btn">≡</button>
    <div class="prompt-menu-menu-items" id="prompt-menu-menu-items"></div>
    <div class="prompt-menu-bottom-buttons">
      <button class="prompt-menu-edit-mode-btn" id="prompt-menu-edit-mode-btn">${lang('editor')}</button>
      <button class="prompt-menu-add-btn" id="prompt-menu-add-btn">${lang('add')}</button>
    </div>
  </div>
  <div id="prompt-menu-add-edit-modal" class="prompt-menu-modal">
    <div class="prompt-menu-modal-content">
      <span class="prompt-menu-close">&times;</span>
      <input type="text" class="prompt-menu-input" id="prompt-menu-item-title" placeholder="${lang('title')}">
      <textarea class="prompt-menu-textarea" id="prompt-menu-item-content" placeholder="${lang('content')}"></textarea>
      <button class="prompt-menu-confirm-btn" id="prompt-menu-confirm-btn">${lang('confirm')}</button>
    </div>
  </div>
`

  // 加载 HTML
  const url = location.href
  if (url.includes('gemini.google.com')) {
    function waitForChatContainer () {
      return new Promise((resolve) => {
        const checkChatContainer = setInterval(() => {
          const chatContainer = document.querySelector('.chat-container')
          if (chatContainer) {
            clearInterval(checkChatContainer)
            resolve(chatContainer)
          }
        }, 100)
      })
    }

    const chatContainer = await waitForChatContainer()
    chatContainer.appendChild(newDiv)
  } else {
    document.body.appendChild(newDiv)
  }

  let menuItems = []
  // 编辑模式
  let editMode = false
  // 当前编辑的索引
  let currentEditIndex = -1

  // 侧边栏
  const sidebar = document.querySelector('.prompt-menu-sidebar')
  // 菜单按钮
  const toggleBtn = document.querySelector('.prompt-menu-toggle-btn')
  // 菜单列表容器
  const menuItemsContainer = document.getElementById('prompt-menu-menu-items')
  // 编辑按钮
  const editModeBtn = document.getElementById('prompt-menu-edit-mode-btn')
  // 天际按钮
  const addBtn = document.getElementById('prompt-menu-add-btn')
  // 弹窗
  const modal = document.getElementById('prompt-menu-add-edit-modal')
  // 弹窗右上角关闭按钮
  const closeBtn = document.getElementsByClassName('prompt-menu-close')[0]
  // 弹窗标题
  const itemTitle = document.getElementById('prompt-menu-item-title')
  // 弹窗内容
  const itemContent = document.getElementById('prompt-menu-item-content')
  // 弹窗确认按钮
  const confirmBtn = document.getElementById('prompt-menu-confirm-btn')

  // 初始化
  function init () {
    chrome.storage.local.get(null).then(result => {
      menuItems = result.menuItems || []
      renderMenuItems()
    })
    // 列表排序功能
    new Sortable(menuItemsContainer, {
      animation: 150,
      onEnd: () => {
        const menuItemIndex = document.querySelectorAll('.prompt-menu-menu-item[data-index]')
        const editorBtnIndex = document.querySelectorAll('.prompt-menu-edit-btn[data-index]')
        const newList = []
        // 重建列表
        for (let i = 0; i < menuItemIndex.length; i++) {
          newList.push(menuItems[menuItemIndex[i].dataset.index])
          menuItemIndex[i].dataset.index = i
          editorBtnIndex[i].dataset.index = i
        }
        menuItems = newList
        chrome.storage.local.set({ menuItems })
      }
    })
  }
  init()

  // 渲染菜单
  function renderMenuItems () {
  // 清空列表
    menuItemsContainer.innerHTML = ''
    menuItems.forEach((item, index) => {
      const menuItem = document.createElement('div')
      menuItem.className = 'prompt-menu-menu-item'
      menuItem.setAttribute('data-index', index)
      menuItem.innerHTML = `
      <span class="prompt-menu-menu-item-title">${item.title}</span>
      <div class="${editMode ? 'prompt-menu-btn-box' : ''}">
        <button class="prompt-menu-edit-btn" data-index="${index}">${lang('editor')}</button>
        ${editMode ? `<button class="prompt-menu-delete-btn" data-index="${index}">${lang('delete')}</button>` : ''}
      </div>`
      // 写入菜单列表
      menuItemsContainer.appendChild(menuItem)
    })
  }

  // 切换菜单
  toggleBtn.addEventListener('click', () => sidebar.classList.toggle('prompt-menu-open'))

  // 切换编辑模式
  editModeBtn.addEventListener('click', () => {
    editMode = !editMode
    editModeBtn.textContent = editMode ? lang('done') : lang('editor')
    renderMenuItems()
  })

  // 监听添加按钮
  addBtn.addEventListener('click', () => showModal())

  // 简体弹窗关闭按钮
  closeBtn.addEventListener('click', hideModal)

  // 监听确认按钮
  confirmBtn.addEventListener('click', () => {
    const title = itemTitle.value.trim()
    const content = itemContent.value.trim()
    if (title && content) {
      if (currentEditIndex !== -1) {
        menuItems[currentEditIndex] = { title, content }
      } else {
        menuItems.push({ title, content })
      }
      hideModal()
      renderMenuItems()
    }
    chrome.storage.local.set({ menuItems })
  })

  // 监听点击空白区域，关闭弹窗
  window.addEventListener('click', event => {
    if (event.target === modal) hideModal()
  })

  /**
 * @description 显示弹窗
 * @param {Boolean} edit - 是否编辑模式
 * @param {string} index - 当前索引的序号
 */
  function showModal (edit = false, index = -1) {
    modal.style.display = 'block'
    currentEditIndex = index
    if (edit && index !== -1) {
      itemTitle.value = menuItems[index].title
      itemContent.value = menuItems[index].content
    } else {
      itemTitle.value = ''
      itemContent.value = ''
    }
  }

  // 隐藏弹窗
  function hideModal () {
    modal.style.display = 'none'
    itemTitle.value = ''
    itemContent.value = ''
    currentEditIndex = -1
  }

  // 使用事件委托处理菜单项的点击、编辑和删除
  menuItemsContainer.addEventListener('click', function (e) {
    const menuItem = e.target.closest('.prompt-menu-menu-item')
    if (menuItem) {
      const index = parseInt(menuItem.getAttribute('data-index'))
      if (e.target.classList.contains('prompt-menu-edit-btn')) {
      // 编辑对应项目
        showModal(true, index)
      } else if (e.target.classList.contains('prompt-menu-delete-btn')) {
      // 删除对应项目
        menuItems.splice(index, 1)
        chrome.storage.local.set({ menuItems })
        // 重新渲染列表
        renderMenuItems()
      } else {
        presetContent(index)
      }
    }
  })

  /**
 * @description 预设内容
 * @param {string} index - 索引的序号
 */
  function presetContent (index) {
  // 获取prompt输入框
    let promptElement
    if (url.includes('chatgpt.com')) {
      promptElement = document.querySelector('#prompt-textarea')
      // promptElement.value = menuItems[index].content
      promptElement.innerHTML = ''
      const p = document.createElement('p')
      p.textContent = menuItems[index].content
      promptElement.appendChild(p)
    } else if (url.includes('claude.ai')) {
      promptElement = document.querySelector('[enterkeyhint="enter"]')
      promptElement.innerHTML = ''
      const p = document.createElement('p')
      p.textContent = menuItems[index].content
      promptElement.appendChild(p)
    } else if (url.includes('duckduckgo.com')) {
      promptElement = document.querySelector('[name="user-prompt"]')
      promptElement.value = menuItems[index].content
    } else if (url.includes('gemini.google.com')) {
      promptElement = document.querySelector('.ql-editor.textarea')
      promptElement.innerHTML = ''
      const p = document.createElement('p')
      p.textContent = menuItems[index].content
      promptElement.appendChild(p)
    } else if (url.includes('www.bing.com/chat')) {
      promptElement = document.querySelector('#searchbox')
      promptElement.value = menuItems[index].content
    } else if (url.includes('perplexity.ai')) {
      promptElement = document.querySelector('textarea')
      promptElement.value = menuItems[index].content
    } else if (url.includes('poe.com')) {
      promptElement = document.querySelector('textarea')
      promptElement.value = menuItems[index].content
    }
    // 触发元素
    triggerElementEvents(promptElement)
  }

  /**
 * @description 模拟用户交互触发元素
 * @param {HTMLElement} el - HTML 元素
 */
  function triggerElementEvents (el) {
    const valueToSet = el.value
    const ev1 = el.ownerDocument.createEvent('HTMLEvents')
    const ev2 = el.ownerDocument.createEvent('HTMLEvents')
    el.dispatchEvent(normalizeEvent(el, 'keydown'))
    el.dispatchEvent(normalizeEvent(el, 'keypress'))
    el.dispatchEvent(normalizeEvent(el, 'keyup'))
    ev2.initEvent('input', true, true)
    el.dispatchEvent(ev2)
    ev1.initEvent('change', true, true)
    el.dispatchEvent(ev1)
    el.blur()
    el.value !== valueToSet && (el.value = valueToSet)
  }

  /**
 * @description 创建并初始化一个标准化的事件对象
 * @param {HTMLElement} el - 事件的目标元素
 * @param {string} eventName - 事件名称
 * @returns {Event} - 标准化的事件对象
 */
  function normalizeEvent (el, eventName) {
    const ev = el.ownerDocument.createEvent('Events')
    ev.initEvent(eventName, true, false)
    ev.charCode = 0
    ev.keyCode = 0
    ev.which = 0
    ev.srcElement = el
    ev.target = el
    return ev
  }
})()
