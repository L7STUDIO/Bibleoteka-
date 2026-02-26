import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  set,
  update,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ====== Firebase config ======
const firebaseConfig = {
  apiKey: "AIzaSyACObv-nmPUDDjC7Q82-eY_XGBhr3lOXSY",
  authDomain: "bibleoteka-a78d5.firebaseapp.com",
  projectId: "bibleoteka-a78d5",
  storageBucket: "bibleoteka-a78d5.firebasestorage.app",
  messagingSenderId: "89565282565",
  appId: "1:89565282565:web:9fd6a7d27547b65e88f76c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// References
const booksRef = ref(db, "books");
const proposalsRef = ref(db, "proposals");
const notificationsRef = ref(db, "notifications");

// ====== Утилиты ======
function showNotification(title, message) {
  const modal = document.getElementById('notificationModal');
  if (!modal) return;
  
  const titleEl = document.getElementById('notificationTitle');
  const messageEl = document.getElementById('notificationMessage');
  
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  modal.style.display = 'block';
  
  setTimeout(() => {
    modal.style.display = 'none';
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function hideLoader() { 
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none"; 
}

// Закрытие модального окна
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.querySelector('.close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const modal = document.getElementById('notificationModal');
      if (modal) modal.style.display = 'none';
    });
  }
  
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('notificationModal');
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // Инициализация тумблера
  const pdfToggle = document.getElementById('pdfToggle');
  if (pdfToggle) {
    pdfToggle.addEventListener('change', function() {
      const fileContainer = document.getElementById('fileInputContainer');
      const linkContainer = document.getElementById('linkInputContainer');
      const toggleLabel = document.getElementById('toggleLabel');
      
      if (this.checked) {
        fileContainer.style.display = 'block';
        linkContainer.style.display = 'none';
        toggleLabel.textContent = 'Файл PDF';
      } else {
        fileContainer.style.display = 'none';
        linkContainer.style.display = 'block';
        toggleLabel.textContent = 'Ссылка на PDF';
      }
    });
  }
  
  // Определяем, на какой странице мы находимся и инициализируем соответствующую логику
  setTimeout(() => {
    initPage();
  }, 100);
});

// ====== Инициализация страницы ======
function initPage() {
  const path = window.location.pathname;
  
  // Главная страница
  if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
    initMainPage();
  }
  // Страница библиотекаря
  else if (path.includes('librarian.html')) {
    initLibrarianPage();
  }
  // Страница менеджера
  else if (path.includes('manager.html')) {
    initManagerPage();
  } else {
    // Если не удалось определить страницу, пробуем по наличию элементов
    if (document.getElementById("booksList")) {
      initMainPage();
    } else if (document.getElementById("myProposals")) {
      initLibrarianPage();
    } else if (document.getElementById("pendingBooks")) {
      initManagerPage();
    } else {
      hideLoader(); // Скрываем лоадер, если ничего не нашли
    }
  }
}

// ====== ГЛАВНАЯ СТРАНИЦА ======
function initMainPage() {
  console.log("Initializing main page");
  const booksList = document.getElementById("booksList");
  const searchInput = document.getElementById("searchInput");
  const alphabetDiv = document.getElementById("alphabet");
  
  if (!booksList) {
    hideLoader();
    return;
  }
  
  // Алфавит
  const letters = "АӘБВГҒДЕЁЖЗИЙКҚЛМНҢОӨПРСТУҰҮФХҺЦЧШЩЪЫІЬЭЮЯ".split("");
  if (alphabetDiv) {
    alphabetDiv.innerHTML = '<div class="letter" data-letter="all">Все</div>';
    
    letters.forEach(l => {
      const el = document.createElement("div");
      el.className = "letter";
      el.textContent = l;
      el.dataset.letter = l;
      alphabetDiv.appendChild(el);
    });
    
    alphabetDiv.addEventListener('click', (e) => {
      if (e.target.classList.contains('letter')) {
        const letter = e.target.dataset.letter;
        filterByLetter(letter);
      }
    });
  }
  
  let allBooks = [];
  
  // Загрузка только одобренных книг
  onValue(booksRef, snapshot => {
    allBooks = [];
    snapshot.forEach(child => {
      const book = child.val();
      // Показываем только одобренные книги
      if (book.approved) {
        allBooks.push({
          id: child.key,
          ...book
        });
      }
    });
    renderBooks(allBooks);
    hideLoader();
  }, error => {
    console.error("Firebase error:", error);
    hideLoader();
    if (booksList) {
      booksList.innerHTML = '<p style="color: var(--accent);">Ошибка загрузки данных</p>';
    }
  });
  
  function renderBooks(list) {
    if (!booksList) return;
    booksList.innerHTML = "";
    
    if (list.length === 0) {
      booksList.innerHTML = '<p style="text-align: center; color: var(--text-light);">Книг пока нет</p>';
      return;
    }
    
    list.forEach(book => {
      const div = document.createElement("div");
      div.className = "book";
      
      // Добавляем ссылку на PDF, если она есть
      let pdfLink = '';
      if (book.pdfUrl) {
        pdfLink = `<a href="${escapeHtml(book.pdfUrl)}" target="_blank" class="book-link">📄 Читать PDF</a>`;
      }
      
      div.innerHTML = `
        <b>${escapeHtml(book.title || '')}</b>
        <div class="book-info">
          <span>${escapeHtml(book.author || '')}</span>
          <span>${escapeHtml(book.year || '')}</span>
        </div>
        ${pdfLink}
      `;
      
      // Делаем всю карточку кликабельной для перехода по ссылке
      if (book.pdfUrl) {
        div.addEventListener('click', (e) => {
          // Не переходим по ссылке, если кликнули на саму ссылку
          if (!e.target.closest('a')) {
            window.open(book.pdfUrl, '_blank');
          }
        });
        div.style.cursor = 'pointer';
      }
      
      booksList.appendChild(div);
    });
  }
  
  // Поиск
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const value = searchInput.value.toLowerCase();
      const filtered = allBooks.filter(b => b.title && b.title.toLowerCase().includes(value));
      renderBooks(filtered);
    });
  }
  
  // Фильтр по букве
  window.filterByLetter = function(letter) {
    if (letter === 'all') {
      renderBooks(allBooks);
    } else {
      const filtered = allBooks.filter(b => b.title && b.title.toUpperCase().startsWith(letter));
      renderBooks(filtered);
    }
  };
}

// ====== СТРАНИЦА БИБЛИОТЕКАРЯ ======
function initLibrarianPage() {
  console.log("Initializing librarian page");
  const myProposalsDiv = document.getElementById("myProposals");
  const notificationsDiv = document.getElementById("librarianNotifications");
  
  if (!myProposalsDiv) {
    hideLoader();
    return;
  }
  
  // Функция добавления предложения
  window.addBookProposal = async function() {
    const title = document.getElementById("title")?.value.trim();
    const author = document.getElementById("author")?.value.trim();
    const year = document.getElementById("year")?.value.trim();
    const useFile = document.getElementById("pdfToggle")?.checked;
    
    if (!title || !author || !year) {
      showNotification('Ошибка', 'Заполните все поля');
      return;
    }
    
    let pdfUrl = '';
    
    if (useFile) {
      // Загрузка файла
      const fileInput = document.getElementById("pdfFile");
      const file = fileInput?.files[0];
      
      if (!file) {
        showNotification('Ошибка', 'Выберите PDF-файл');
        return;
      }
      
      if (file.type !== 'application/pdf') {
        showNotification('Ошибка', 'Можно загружать только PDF-файлы');
        return;
      }
      
      try {
        // Создаем уникальное имя файла
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const fileRef = storageRef(storage, `books/${fileName}`);
        
        // Загружаем файл
        await uploadBytes(fileRef, file);
        
        // Получаем URL для скачивания
        pdfUrl = await getDownloadURL(fileRef);
      } catch (error) {
        console.error("Error uploading file:", error);
        showNotification('Ошибка', 'Не удалось загрузить файл');
        return;
      }
    } else {
      // Использование ссылки
      pdfUrl = document.getElementById("pdfLink")?.value.trim();
      
      if (!pdfUrl) {
        showNotification('Ошибка', 'Введите ссылку на PDF');
        return;
      }
      
      // Простая валидация URL
      try {
        new URL(pdfUrl);
      } catch {
        showNotification('Ошибка', 'Введите корректную ссылку');
        return;
      }
    }
    
    const proposal = {
      title,
      author,
      year,
      pdfUrl,
      letter: title[0].toUpperCase(),
      status: 'pending',
      date: new Date().toISOString(),
      librarianId: 'librarian_1'
    };
    
    push(proposalsRef, proposal).then(() => {
      document.getElementById("title").value = "";
      document.getElementById("author").value = "";
      document.getElementById("year").value = "";
      document.getElementById("pdfFile").value = "";
      document.getElementById("pdfLink").value = "https://olehnik.ru/files/literatura/Н. Гоголь Шинель.pdf";
      
      showNotification('Успешно', 'Книга отправлена на модерацию');
    }).catch(error => {
      console.error("Error adding proposal:", error);
      showNotification('Ошибка', 'Не удалось отправить книгу');
    });
  };
  
  // Загрузка предложений библиотекаря
  onValue(proposalsRef, snapshot => {
    const proposals = [];
    snapshot.forEach(child => {
      const prop = child.val();
      prop.id = child.key;
      proposals.push(prop);
    });
    
    const myProposals = proposals.filter(p => p.librarianId === 'librarian_1');
    renderMyProposals(myProposals);
    hideLoader();
  }, error => {
    console.error("Firebase error:", error);
    hideLoader();
  });
  
  function renderMyProposals(proposals) {
    if (!myProposalsDiv) return;
    myProposalsDiv.innerHTML = "";
    
    if (proposals.length === 0) {
      myProposalsDiv.innerHTML = '<p style="color: var(--text-light);">У вас пока нет предложений</p>';
      return;
    }
    
    proposals.reverse().forEach(book => {
      const div = document.createElement("div");
      div.className = `book ${book.status || 'pending'}`;
      
      let statusText = '';
      let statusColor = '#ff9800';
      
      switch(book.status) {
        case 'approved':
          statusText = '✅ Одобрена';
          statusColor = '#28a745';
          break;
        case 'rejected':
          statusText = '❌ Отклонена';
          statusColor = 'var(--accent)';
          break;
        default:
          statusText = '⏳ На проверке';
          statusColor = '#ff9800';
      }
      
      let pdfInfo = '';
      if (book.pdfUrl) {
        pdfInfo = `<span style="font-size: 0.7rem; color: #2196F3;">📄 PDF: ${book.pdfUrl.includes('firebase') ? 'Загруженный файл' : 'По ссылке'}</span>`;
      }
      
      div.innerHTML = `
        <b>${escapeHtml(book.title)}</b>
        <div class="book-info">
          <span>${escapeHtml(book.author)}</span>
          <span>${escapeHtml(book.year)}</span>
          <span style="color: ${statusColor}">${statusText}</span>
          ${pdfInfo}
          ${book.rejectionReason ? `<span class="rejection-reason">Причина: ${escapeHtml(book.rejectionReason)}</span>` : ''}
          <span style="font-size: 0.7rem; color: #999;">${new Date(book.date).toLocaleString()}</span>
        </div>
      `;
      myProposalsDiv.appendChild(div);
    });
  }
  
  // Загрузка уведомлений
  onValue(notificationsRef, snapshot => {
    const notifications = [];
    snapshot.forEach(child => {
      const notif = child.val();
      if (notif.librarianId === 'librarian_1') {
        notifications.push(notif);
      }
    });
    
    if (notificationsDiv) {
      if (notifications.length > 0) {
        const lastNotif = notifications[notifications.length - 1];
        notificationsDiv.innerHTML = `
          <div class="notification-item">
            <strong>${escapeHtml(lastNotif.title || '')}</strong>
            <p>${escapeHtml(lastNotif.message || '')}</p>
            <small>${lastNotif.date ? new Date(lastNotif.date).toLocaleString() : ''}</small>
          </div>
        `;
      } else {
        notificationsDiv.innerHTML = '';
      }
    }
  });
}

// ====== СТРАНИЦА МЕНЕДЖЕРА ======
function initManagerPage() {
  console.log("Initializing manager page");
  const pendingBooksDiv = document.getElementById("pendingBooks");
  const notificationsListDiv = document.getElementById("notificationsList");
  const pendingCountSpan = document.getElementById("pendingCount");
  
  if (!pendingBooksDiv) {
    hideLoader();
    return;
  }
  
  // Загрузка предложений на модерацию
  onValue(proposalsRef, snapshot => {
    const pending = [];
    snapshot.forEach(child => {
      const prop = child.val();
      prop.id = child.key;
      if (prop.status === 'pending') {
        pending.push(prop);
      }
    });
    
    if (pendingCountSpan) {
      pendingCountSpan.textContent = pending.length;
    }
    
    renderPendingBooks(pending);
    hideLoader();
  }, error => {
    console.error("Firebase error:", error);
    hideLoader();
  });
  
  function renderPendingBooks(pending) {
    if (!pendingBooksDiv) return;
    pendingBooksDiv.innerHTML = "";
    
    if (pending.length === 0) {
      pendingBooksDiv.innerHTML = '<p style="color: var(--text-light);">Нет книг на модерации</p>';
      return;
    }
    
    pending.forEach(book => {
      const div = document.createElement("div");
      div.className = "book pending-card";
      
      let pdfInfo = '';
      if (book.pdfUrl) {
        pdfInfo = `<div style="margin: 10px 0; padding: 5px; background: #f0f0f0; border-radius: 4px;">
          <a href="${escapeHtml(book.pdfUrl)}" target="_blank" style="color: #2196F3;">📄 Просмотреть PDF</a>
        </div>`;
      }
      
      div.innerHTML = `
        <b>${escapeHtml(book.title)}</b>
        <div class="book-info">
          <span>${escapeHtml(book.author)}</span>
          <span>${escapeHtml(book.year)}</span>
          <span style="font-size: 0.7rem; color: #999;">${book.date ? new Date(book.date).toLocaleString() : ''}</span>
        </div>
        ${pdfInfo}
        <div class="book-actions">
          <button class="approve-btn" onclick="approveBook('${book.id}')">✓ Одобрить</button>
          <button class="reject-btn" onclick="rejectBook('${book.id}')">✗ Отклонить</button>
        </div>
      `;
      pendingBooksDiv.appendChild(div);
    });
  }
  
  // Одобрение книги
  window.approveBook = function(proposalId) {
    const proposalRef = ref(db, `proposals/${proposalId}`);
    
    get(proposalRef).then(snapshot => {
      const proposal = snapshot.val();
      
      // Добавляем в книги
      const newBookRef = push(booksRef);
      set(newBookRef, {
        title: proposal.title,
        author: proposal.author,
        year: proposal.year,
        pdfUrl: proposal.pdfUrl,
        letter: proposal.letter,
        approved: true,
        approvedDate: new Date().toISOString()
      });
      
      // Обновляем статус предложения
      update(proposalRef, {
        status: 'approved'
      });
      
      // Создаем уведомление для библиотекаря
      const notificationRef = push(notificationsRef);
      set(notificationRef, {
        librarianId: proposal.librarianId,
        title: 'Книга одобрена',
        message: `Книга "${proposal.title}" добавлена в каталог`,
        date: new Date().toISOString()
      });
      
      showNotification('Успешно', 'Книга одобрена');
    }).catch(error => {
      console.error("Error approving book:", error);
      showNotification('Ошибка', 'Не удалось одобрить книгу');
    });
  };
  
  // Отклонение книги
  window.rejectBook = function(proposalId) {
    const reason = prompt('Укажите причину отклонения:');
    if (reason === null || reason.trim() === '') return;
    
    const proposalRef = ref(db, `proposals/${proposalId}`);
    
    get(proposalRef).then(snapshot => {
      const proposal = snapshot.val();
      
      update(proposalRef, {
        status: 'rejected',
        rejectionReason: reason.trim()
      });
      
      const notificationRef = push(notificationsRef);
      set(notificationRef, {
        librarianId: proposal.librarianId,
        title: 'Книга отклонена',
        message: `Книга "${proposal.title}" отклонена. Причина: ${reason.trim()}`,
        date: new Date().toISOString()
      });
      
      showNotification('Отклонено', 'Книга отклонена');
    }).catch(error => {
      console.error("Error rejecting book:", error);
      showNotification('Ошибка', 'Не удалось отклонить книгу');
    });
  };
  
  // Загрузка истории уведомлений
  onValue(notificationsRef, snapshot => {
    if (!notificationsListDiv) return;
    
    const notifications = [];
    snapshot.forEach(child => {
      notifications.push(child.val());
    });
    
    if (notifications.length === 0) {
      notificationsListDiv.innerHTML = '<p style="color: var(--text-light);">Нет уведомлений</p>';
      return;
    }
    
    notificationsListDiv.innerHTML = notifications.reverse().map(notif => `
      <div class="notification-item">
        <strong>${escapeHtml(notif.title || '')}</strong>
        <p>${escapeHtml(notif.message || '')}</p>
        <small>${notif.date ? new Date(notif.date).toLocaleString() : ''}</small>
      </div>
    `).join('');
  });
}

// Глобальные функции
window.showNotification = showNotification;

// ====== АВТОРИЗАЦИЯ МЕНЕДЖЕРА ======
const MANAGER_CREDENTIALS = {
  username: "ValeriyAleksandrovich",
  password: "V@l3r1y_S3cr3t_P@ssw0rd_2024!xYz"
};

// Проверка авторизации при загрузке
window.checkManagerAuth = function() {
  const isAuth = sessionStorage.getItem('managerAuthenticated') === 'true';
  const loginTime = parseInt(sessionStorage.getItem('managerLoginTime') || '0');
  const isValid = isAuth && (Date.now() - loginTime < 60 * 60 * 1000); // 1 час
  
  const protectedContent = document.getElementById('protectedContent');
  const authMessage = document.getElementById('authMessage');
  const loginBlock = document.getElementById('loginBlock');
  const authStatus = document.getElementById('authStatus');
  
  if (protectedContent && authMessage && loginBlock && authStatus) {
    if (isValid) {
      // Авторизован
      protectedContent.classList.remove('protected');
      authMessage.style.display = 'none';
      loginBlock.classList.add('hidden');
      authStatus.classList.remove('hidden');
      
      // Продлеваем сессию
      sessionStorage.setItem('managerLoginTime', Date.now());
      
      // Загружаем данные менеджера
      if (typeof initManagerPage === 'function') {
        initManagerPage();
      }
    } else {
      // Не авторизован
      protectedContent.classList.add('protected');
      authMessage.style.display = 'block';
      loginBlock.classList.remove('hidden');
      authStatus.classList.add('hidden');
      
      // Очищаем невалидную сессию
      sessionStorage.removeItem('managerAuthenticated');
      sessionStorage.removeItem('managerLoginTime');
    }
  }
};

// Функция входа
window.login = function() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  
  if (username === MANAGER_CREDENTIALS.username && 
      password === MANAGER_CREDENTIALS.password) {
    
    sessionStorage.setItem('managerAuthenticated', 'true');
    sessionStorage.setItem('managerLoginTime', Date.now());
    
    checkManagerAuth();
    showNotification('Успешно', 'Добро пожаловать, менеджер!');
  } else {
    showNotification('Ошибка', 'Неверный логин или пароль');
  }
};

// Функция выхода
window.logout = function() {
  sessionStorage.removeItem('managerAuthenticated');
  sessionStorage.removeItem('managerLoginTime');
  checkManagerAuth();
  showNotification('До свидания', 'Вы вышли из системы');
};

// Модифицируем initManagerPage для проверки авторизации
const originalInitManagerPage = initManagerPage;
initManagerPage = function() {
  if (sessionStorage.getItem('managerAuthenticated') === 'true') {
    originalInitManagerPage();
  } else {
    console.log('Manager not authenticated');
  }
};

// Проверяем авторизацию при загрузке страницы менеджера
if (window.location.pathname.includes('manager.html')) {
  // Ждем загрузку DOM
  setTimeout(checkManagerAuth, 100);
}