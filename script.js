// ===== Бургер-меню =====
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

burger.addEventListener('click', () => {
    burger.classList.toggle('burger--open');
    nav.classList.toggle('nav--open');
    document.body.style.overflow = nav.classList.contains('nav--open') ? 'hidden' : '';
});

// Закрытие меню при клике на ссылку
nav.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
        burger.classList.remove('burger--open');
        nav.classList.remove('nav--open');
        document.body.style.overflow = '';
    });
});

// ===== Скрытие/показ шапки при прокрутке =====
let lastScroll = 0;
const header = document.getElementById('header');

window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;

    if (currentScroll > 100) {
        header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.08)';
    } else {
        header.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// ===== Модальное окно заказа =====
const orderModal = document.getElementById('orderModal');
const modalProduct = document.getElementById('modalProduct');
const modalPrice = document.getElementById('modalPrice');

function openOrder(productName, price) {
    modalProduct.textContent = productName;
    modalPrice.textContent = price;
    orderModal.classList.add('modal--active');
    document.body.style.overflow = 'hidden';
}

function closeOrder() {
    orderModal.classList.remove('modal--active');
    document.body.style.overflow = '';
}

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeOrder();
    }
});

// ===== Toast-уведомления =====
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('toast--visible');
    setTimeout(() => {
        toast.classList.remove('toast--visible');
    }, duration);
}

// ===== Обработка формы заказа =====
function handleOrderForm(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Валидация
    if (!data.name.trim()) {
        showToast('Пожалуйста, укажите ваше имя');
        return false;
    }
    if (!data.phone.trim()) {
        showToast('Пожалуйста, укажите телефон');
        return false;
    }

    // Собираем данные заказа
    const orderData = {
        product: modalProduct.textContent,
        price: modalPrice.textContent,
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email ? data.email.trim() : '',
        city: data.city ? data.city.trim() : '',
        comment: data.comment ? data.comment.trim() : '',
        date: new Date().toISOString()
    };

    console.log('Заказ:', orderData);

    // Имитация отправки
    closeOrder();
    form.reset();
    showToast('Заявка отправлена! Мы свяжемся с вами в ближайшее время.');

    return false;
}

// ===== Обработка формы обратной связи =====
function handleContactForm(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    if (!data.name.trim()) {
        showToast('Пожалуйста, укажите ваше имя');
        return false;
    }
    if (!data.phone.trim()) {
        showToast('Пожалуйста, укажите телефон');
        return false;
    }

    const contactData = {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email ? data.email.trim() : '',
        message: data.message ? data.message.trim() : '',
        date: new Date().toISOString()
    };

    console.log('Обращение:', contactData);

    form.reset();
    showToast('Сообщение отправлено! Мы ответим вам в ближайшее время.');

    return false;
}

// ===== Плавная анимация появления при прокрутке =====
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Анимируем карточки и секции
document.addEventListener('DOMContentLoaded', () => {
    const animateElements = document.querySelectorAll(
        '.advantage-card, .product-card, .includes__item, .step, .tech-block, .counter'
    );

    animateElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.6s ease ${index % 3 * 0.1}s, transform 0.6s ease ${index % 3 * 0.1}s`;
        observer.observe(el);
    });
});

// ===== Плавный скролл для якорных ссылок (фолбэк) =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            const headerHeight = document.getElementById('header').offsetHeight;
            const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});
