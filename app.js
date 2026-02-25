import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ВСТАВЬ СЮДА СВОЙ CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyACObv-nmPUDDjC7Q82-eY_XGBhr3lOXSY",
  authDomain: "bibleoteka-a78d5.firebaseapp.com",
  projectId: "bibleoteka-a78d5",
  storageBucket: "bibleoteka-a78d5.firebasestorage.app",
  messagingSenderId: "89565282565",
  appId: "1:89565282565:web:9fd6a7d27547b65e88f76c",
  measurementId: "G-3C4NWS90FG"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const booksRef = ref(db, "books");
const booksList = document.getElementById("booksList");
const searchInput = document.getElementById("searchInput");

let allBooks = [];

// алфавит
const alphabetDiv = document.getElementById("alphabet");
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ".split("");

letters.forEach(l => {
  const el = document.createElement("div");
  el.className = "letter";
  el.textContent = l;
  el.onclick = () => filterByLetter(l);
  alphabetDiv.appendChild(el);
});

// загрузка книг
onValue(booksRef, snapshot => {
  allBooks = [];

  snapshot.forEach(child => {
    allBooks.push(child.val());
  });

  renderBooks(allBooks);
});

// рендер
function renderBooks(list) {
  booksList.innerHTML = "";

  list.forEach(book => {
    const div = document.createElement("div");
    div.className = "book";
    div.innerHTML = `
      <b>${book.title}</b><br>
      Автор: ${book.author}<br>
      Год: ${book.year}
    `;
    booksList.appendChild(div);
  });
}

// поиск
searchInput.addEventListener("input", () => {
  const value = searchInput.value.toLowerCase();
  const filtered = allBooks.filter(b =>
    b.title.toLowerCase().includes(value)
  );
  renderBooks(filtered);
});

// фильтр по букве
function filterByLetter(letter) {
  const filtered = allBooks.filter(b => b.letter === letter);
  renderBooks(filtered);
}

// добавление
window.addBook = async function () {
  const title = document.getElementById("title").value.trim();
  const author = document.getElementById("author").value.trim();
  const year = document.getElementById("year").value.trim();

  if (!title) return;

  await push(booksRef, {
    title,
    author,
    year,
    letter: title[0].toUpperCase()
  });
};