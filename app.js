const express = require('express');
const { Client } = require('pg');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' ? true : false
  }
});

// Connect to database
client.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Connection error', err.stack));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// HTML header and footer templates with enhanced styling
const getHeader = (title) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Urban Pune</title>
  <!-- Bootstrap CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Bootstrap Icons -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
  <!-- Animation CSS -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
  <!-- AOS Animation Library -->
  <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
  <!-- Custom styles -->
  <style>
    :root {
      --primary-color: #3a0ca3;
      --secondary-color: #4cc9f0;
      --accent-color: #f72585;
      --dark-color: #1a1a2e;
      --light-color: #f8f9fa;
      --success-color: #4caf50;
      --warning-color: #ff9800;
      --danger-color: #f44336;
      --info-color: #2196f3;
    }
    
    body {
      font-family: 'Poppins', sans-serif;
      background-color: #f0f2f5;
      transition: all 0.3s ease;
    }
    
    .bg-real-estate {
      background: linear-gradient(135deg, var(--dark-color) 0%, #2a2a5a 100%);
      color: white;
    }
    
    .navbar {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      padding: 15px 0;
    }
    
    .navbar-brand {
      font-weight: 800;
      letter-spacing: 1px;
      font-size: 1.5rem;
      color: white;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    .nav-link {
      font-weight: 600;
      position: relative;
      margin: 0 10px;
      transition: all 0.3s ease;
    }
    
    .nav-link:after {
      content: '';
      position: absolute;
      width: 0;
      height: 2px;
      bottom: 0;
      left: 0;
      background-color: var(--secondary-color);
      transition: width 0.3s ease;
    }
    
    .nav-link:hover:after {
      width: 100%;
    }
    
    .card {
      transition: transform 0.4s, box-shadow 0.4s;
      border-radius: 12px;
      border: none;
      overflow: hidden;
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.08);
      margin-bottom: 20px;
    }
    
    .card:hover {
      transform: translateY(-10px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
    }
    
    .card-header {
      border-bottom: none;
      padding: 20px;
      font-weight: 700;
    }
    
    .table-hover tbody tr {
      transition: all 0.3s ease;
    }
    
    .table-hover tbody tr:hover {
      background-color: rgba(76, 201, 240, 0.1);
      transform: scale(1.01);
    }
    
    .nav-pills .nav-link.active {
      background-color: var(--primary-color);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .nav-pills .nav-link {
      color: var(--dark-color);
      border-radius: 30px;
      padding: 8px 20px;
      margin: 0 5px;
      transition: all 0.3s ease;
    }
    
    .nav-pills .nav-link:hover {
      background-color: rgba(58, 12, 163, 0.1);
    }
    
    .btn {
      border-radius: 30px;
      padding: 10px 25px;
      font-weight: 600;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      z-index: 1;
    }
    
    .btn:after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -2;
    }
    
    .btn:before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 0%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.1);
      transition: all 0.3s;
      z-index: -1;
    }
    
    .btn:hover:before {
      width: 100%;
    }
    
    .btn-primary {
      background-color: var(--primary-color);
      border-color: var(--primary-color);
    }
    
    .btn-primary:hover {
      background-color: #2a0a7a;
      border-color: #2a0a7a;
    }
    
    .btn-outline-primary {
      color: var(--primary-color);
      border-color: var(--primary-color);
    }
    
    .btn-outline-primary:hover {
      background-color: var(--primary-color);
      border-color: var(--primary-color);
    }
    
    .page-header {
      padding: 3rem 0;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      margin-bottom: 2rem;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }
    
    .profile-card {
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border-radius: 15px;
      padding: 2rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    }
    
    .empty-state {
      text-align: center;
      padding: 4rem 0;
    }
    
    .empty-state i {
      font-size: 4rem;
      color: #dee2e6;
      margin-bottom: 1.5rem;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.7;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    .jumbotron {
      position: relative;
      color: white;
      font-size: 45px;
      background: url('room.jpg') 
      no-repeat center center/cover !important;
      text-align: center;
      border: none;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      z-index: 1;
      border-radius: 2px;
      margin: 40px auto;
      max-width: 90%;
      padding: 80px 40px;
    }
    
    .jumbotron::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(47, 46, 48, 0.35) 0%, rgba(58, 53, 54, 0.28) 100%);
      z-index: -1;
    }
    
    .jumbotron h1 {
      font-size: 3.5rem;
      font-weight: 800;
      margin-bottom: 20px;
      text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5);
      animation: fadeInDown 1s ease-out;
    }
    
    .jumbotron p {
      font-size: 1.5rem;
      margin-bottom: 30px;
      text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.5);
      animation: fadeInUp 1s ease-out;
    }
    
    .jumbotron .btn {
      animation: bounceIn 1s ease-out;
      font-size: 1.2rem;
      padding: 12px 30px;
      box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
    }
    
    /* Table styling */
    .table {
      border-collapse: separate;
      border-spacing: 0 8px;
    }
    
    .table thead th {
      border-bottom: none;
      font-weight: 700;
      color: var(--dark-color);
      text-transform: uppercase;
      font-size: 0.85rem;
      letter-spacing: 1px;
    }
    
    .table tbody tr {
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      border-radius: 10px;
      background-color: white;
    }
    
    .table tbody td {
      padding: 15px;
      vertical-align: middle;
      border-top: none;
    }
    
    .table tbody tr td:first-child {
      border-top-left-radius: 10px;
      border-bottom-left-radius: 10px;
    }
    
    .table tbody tr td:last-child {
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
    }
    
    /* Dashboard cards */
    .dashboard-card {
      border-radius: 15px;
      overflow: hidden;
      transition: all 0.3s ease;
      height: 100%;
    }
    
    .dashboard-card-icon {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 15px;
      font-size: 1.8rem;
      margin-bottom: 15px;
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      color: white;
      box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
    }
    
    /* Tabs styling */
    .nav-tabs {
      border-bottom: none;
      margin-bottom: 20px;
    }
    
    .nav-tabs .nav-link {
      border: none;
      border-radius: 30px;
      padding: 10px 20px;
      margin-right: 10px;
      font-weight: 600;
      color: var(--dark-color);
      transition: all 0.3s ease;
    }
    
    .nav-tabs .nav-link:hover {
      background-color: rgba(58, 12, 163, 0.05);
    }
    
    .nav-tabs .nav-link.active {
      color: white;
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }
    
    /* Animation classes */
    .fade-in {
      animation: fadeIn 0.5s ease-in-out;
    }
    
    .slide-up {
      animation: slideUp 0.5s ease-in-out;
    }
    
    .bounce {
      animation: bounce 0.5s ease-in-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-20px); }
      60% { transform: translateY(-10px); }
    }
    
    /* User profile styling */
    .avatar-placeholder {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
      border: 5px solid white;
    }
    
    .user-badge {
      display: inline-block;
      padding: 8px 15px;
      border-radius: 30px;
      font-weight: 600;
      font-size: 0.85rem;
      margin-bottom: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .user-info-item {
      padding: 15px;
      border-radius: 10px;
      background-color: rgba(248, 249, 250, 0.7);
      margin-bottom: 15px;
      transition: all 0.3s ease;
    }
    
    .user-info-item:hover {
      background-color: white;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
      transform: translateY(-5px);
    }
    
    .user-info-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background-color: rgba(58, 12, 163, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary-color);
      margin-right: 15px;
    }
    
    /* Loader animation */
    .loader {
      width: 48px;
      height: 48px;
      border: 5px solid var(--light-color);
      border-bottom-color: var(--primary-color);
      border-radius: 50%;
      display: inline-block;
      box-sizing: border-box;
      animation: rotation 1s linear infinite;
    }
    
    @keyframes rotation {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 10px;
    }
    
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    
    ::-webkit-scrollbar-thumb {
      background: var(--primary-color);
      border-radius: 10px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #2a0a7a;
    }
    
    /* Property cards */
    .property-card {
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      height: 100%;
    }
    
    .property-card:hover {
      transform: translateY(-10px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
    }
    
    .property-card-img {
      height: 200px;
      object-fit: cover;
    }
    
    .property-card-price {
      position: absolute;
      top: 15px;
      right: 15px;
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      color: white;
      padding: 8px 15px;
      border-radius: 30px;
      font-weight: 700;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }
    
    .property-card-badge {
      position: absolute;
      top: 15px;
      left: 15px;
      background-color: var(--accent-color);
      color: white;
      padding: 8px 15px;
      border-radius: 30px;
      font-weight: 700;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }
    
    .property-card-content {
      padding: 20px;
    }
    
    .property-card-title {
      font-weight: 700;
      margin-bottom: 10px;
      font-size: 1.2rem;
    }
    
    .property-card-address {
      color: #6c757d;
      margin-bottom: 15px;
      font-size: 0.9rem;
    }
    
    .property-card-features {
      display: flex;
      justify-content: space-between;
      padding-top: 15px;
      border-top: 1px solid #e9ecef;
    }
    
    .property-card-feature {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .property-card-feature-icon {
      color: var(--primary-color);
      font-size: 1.2rem;
      margin-bottom: 5px;
    }
    
    .property-card-feature-text {
      font-size: 0.85rem;
      font-weight: 600;
    }
  </style>
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
  <nav class="navbar navbar-expand-lg navbar-dark bg-real-estate">
    <div class="container">
      <a class="navbar-brand" href="/">
        <i class="bi bi-buildings me-2"></i>Urban Pune
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <a class="nav-link" href="/"><i class="bi bi-house me-1"></i> Home</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/filter"><i class="bi bi-search me-1"></i> Advanced Search</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/user-reports"><i class="bi bi-file-earmark-text me-1"></i> User Reports</a>
          </li>
        </ul>
      </div>
    </div>
  </nav>
  <div class="container py-4">
`;

const getFooter = () => `
  </div>
  <footer class="bg-real-estate text-white py-5 mt-5">
    <div class="container">
      <div class="row">
        <div class="col-md-6">
          <h5 class="mb-3"><i class="bi bi-buildings me-2"></i>Urban Pune Database</h5>
          <p class="mb-3">A comprehensive solution for managing real estate data in Pune</p>
          <div class="d-flex gap-3">
            <a href="#" class="text-white"><i class="bi bi-facebook fs-4"></i></a>
            <a href="#" class="text-white"><i class="bi bi-twitter fs-4"></i></a>
            <a href="#" class="text-white"><i class="bi bi-instagram fs-4"></i></a>
            <a href="#" class="text-white"><i class="bi bi-linkedin fs-4"></i></a>
          </div>
        </div>
        <div class="col-md-6 text-md-end mt-4 mt-md-0">
          <h5 class="mb-3">Quick Links</h5>
          <ul class="list-unstyled">
            <li><a href="/" class="text-white text-decoration-none"><i class="bi bi-chevron-right me-1"></i> Home</a></li>
            <li><a href="/filter" class="text-white text-decoration-none"><i class="bi bi-chevron-right me-1"></i> Advanced Search</a></li>
            <li><a href="/user-reports" class="text-white text-decoration-none"><i class="bi bi-chevron-right me-1"></i> User Reports</a></li>
          </ul>
          <p class="mt-3">&copy; ${new Date().getFullYear()} Urban Pune Database</p>
        </div>
      </div>
    </div>
  </footer>
  
  <!-- Bootstrap JS Bundle with Popper -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
  <!-- AOS Animation Library -->
  <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
  
  <script>
    // Initialize AOS animations
    document.addEventListener('DOMContentLoaded', function() {
      AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
      });
      
      // Add animation classes to elements
      const animateElements = document.querySelectorAll('.card, .table tbody tr, .btn-primary, .jumbotron');
      animateElements.forEach((element, index) => {
        element.style.animationDelay = \`\${index * 0.1}s\`;
        element.classList.add('fade-in');
      });
    });
    
    // Simple client-side filtering for tables
    function filterTable() {
      const input = document.getElementById('tableFilter');
      const filter = input.value.toUpperCase();
      const table = document.querySelector('table');
      const rows = table.getElementsByTagName('tr');
      
      for (let i = 1; i < rows.length; i++) {
        let visible = false;
        const cells = rows[i].getElementsByTagName('td');
        
        for (let j = 0; j < cells.length; j++) {
          const cell = cells[j];
          if (cell) {
            const text = cell.textContent || cell.innerText;
            if (text.toUpperCase().indexOf(filter) > -1) {
              visible = true;
              break;
            }
          }
        }
        
        rows[i].style.display = visible ? '' : 'none';
      }
    }
    
    // Add hover effects to table rows
    const tableRows = document.querySelectorAll('.table tbody tr');
    tableRows.forEach(row => {
      row.addEventListener('mouseenter', () => {
        row.style.transform = 'scale(1.01)';
        row.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
        row.style.zIndex = '1';
      });
      
      row.addEventListener('mouseleave', () => {
        row.style.transform = 'scale(1)';
        row.style.boxShadow = 'none';
        row.style.zIndex = '0';
      });
    });
    
    // Add loading animation
    function showLoading() {
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'loading-overlay';
      loadingOverlay.style.position = 'fixed';
      loadingOverlay.style.top = '0';
      loadingOverlay.style.left = '0';
      loadingOverlay.style.width = '100%';
      loadingOverlay.style.height = '100%';
      loadingOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
      loadingOverlay.style.display = 'flex';
      loadingOverlay.style.justifyContent = 'center';
      loadingOverlay.style.alignItems = 'center';
      loadingOverlay.style.zIndex = '9999';
      
      const spinner = document.createElement('span');
      spinner.className = 'loader';
      loadingOverlay.appendChild(spinner);
      
      document.body.appendChild(loadingOverlay);
      
      setTimeout(() => {
        document.body.removeChild(loadingOverlay);
      }, 800);
    }
    
    // Add loading animation to links
    const links = document.querySelectorAll('a:not([target="_blank"])');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        if (link.getAttribute('href') !== '#' && !link.getAttribute('href').startsWith('javascript')) {
          e.preventDefault();
          showLoading();
          setTimeout(() => {
            window.location.href = link.getAttribute('href');
          }, 500);
        }
      });
    });
    
    // Add loading animation to forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', () => {
        showLoading();
      });
    });
  </script>
</body>
</html>
`;

// Helper function to format data as HTML table with Bootstrap styling and animations
function formatAsTable(rows, title, includeFilter = true) {
  if (rows.length === 0) {
    return `
      <div class="card mb-4" data-aos="fade-up">
        <div class="card-header bg-real-estate text-white">
          <h5 class="mb-0"><i class="bi bi-table me-2"></i>${title}</h5>
        </div>
        <div class="card-body">
          <div class="empty-state">
            <i class="bi bi-inbox"></i>
            <h5>No Data Found</h5>
            <p class="text-muted">There are no records to display at this time.</p>
          </div>
        </div>
      </div>`;
  }

  let html = `
    <div class="card mb-4" data-aos="fade-up">
      <div class="card-header bg-real-estate text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0"><i class="bi bi-table me-2"></i>${title}</h5>`;

  if (includeFilter) {
    html += `
        <div class="input-group input-group-sm w-auto">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input type="text" id="tableFilter" class="form-control" onkeyup="filterTable()" placeholder="Search...">
        </div>`;
  }

  html += `
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead>
              <tr>`;

  // Table headers
  for (const column in rows[0]) {
    html += `<th>${column}</th>`;
  }
  html += '</tr></thead><tbody>';

  // Table rows with animation delay
  rows.forEach((row, index) => {
    html += `<tr data-aos="fade-up" data-aos-delay="${index * 50}">`;
    for (const column in row) {
      const value = row[column] !== null ? row[column] : 'N/A';
      html += `<td>${value}</td>`;
    }
    html += '</tr>';
  });

  html += '</tbody></table></div></div></div>';
  return html;
}

// Define table metadata for better display and filtering - FIXED to match schema
const tables = [
  { name: 'users', title: 'Users', key: 'u_id', searchFields: ['u_id', 'name', 'email', 'phone'], icon: 'people' },
  { name: 'properties', title: 'Properties', key: 'p_id', searchFields: ['p_id', 'title', 'address', 'city'], icon: 'house' },
  { name: 'property_media', title: 'Property Media', key: 'media_id', searchFields: ['media_id', 'property_id'], icon: 'images' },
  { name: 'amenities', title: 'Amenities', key: 'id', searchFields: ['id', 'name', 'category'], icon: 'list-check' },
  { name: 'property_amenities', title: 'Property Amenities', key: 'id', searchFields: ['id', 'property_id', 'amenity_id'], icon: 'check2-square' },
  { name: 'favorites', title: 'Favorites', key: 'id', searchFields: ['id', 'user_id', 'property_id'], icon: 'heart' },
  { name: 'messages', title: 'Messages', key: 'id', searchFields: ['id', 'sender_id', 'receiver_id'], icon: 'chat' },
  { name: 'enquiries', title: 'Enquiries', key: 'id', searchFields: ['id', 'user_id', 'property_id'], icon: 'question-circle' },
  { name: 'ratings', title: 'Ratings', key: 'id', searchFields: ['id', 'user_id', 'property_id'], icon: 'star' },
  { name: 'payments', title: 'Payments', key: 'id', searchFields: ['id', 'user_id', 'property_id'], icon: 'credit-card' }
];

// API endpoints for each table
tables.forEach(({ name, title, icon }) => {
  app.get(`/api/${name}`, async (req, res) => {
    try {
      let query = `SELECT * FROM ${name}`;
      const params = [];

      // Handle query parameters for filtering
      const filters = [];
      let paramIndex = 1;

      for (const key in req.query) {
        if (req.query[key]) {
          if (key === 'search') {
            // Handle general search across multiple columns
            const tableInfo = tables.find(t => t.name === name);
            if (tableInfo && tableInfo.searchFields.length > 0) {
              const searchConditions = tableInfo.searchFields.map(field => {
                params.push(`%${req.query[key]}%`);
                return `${field}::text ILIKE $${paramIndex++}`;
              });
              filters.push(`(${searchConditions.join(' OR ')})`);
            }
          } else {
            // Handle exact match on specific column
            params.push(req.query[key]);
            filters.push(`${key} = $${paramIndex++}`);
          }
        }
      }

      if (filters.length > 0) {
        query += ` WHERE ${filters.join(' AND ')}`;
      }

      const result = await client.query(query, params);

      // Send full HTML page
      res.send(
        getHeader(title) +
        `<div class="page-header" data-aos="fade-down">
          <div class="container">
            <h2><i class="bi bi-${icon} me-2"></i>${title}</h2>
            <nav aria-label="breadcrumb">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="/">Home</a></li>
                <li class="breadcrumb-item active">${title}</li>
              </ol>
            </nav>
          </div>
        </div>` +
        formatAsTable(result.rows, title) +
        getFooter()
      );
    } catch (err) {
      res.status(500).send(
        getHeader('Error') +
        `<div class="alert alert-danger my-4" role="alert" data-aos="fade-up">
          <h4 class="alert-heading"><i class="bi bi-exclamation-triangle me-2"></i>Error</h4>
          <p>${err.message}</p>
          <hr>
          <a href="/" class="btn btn-outline-danger">Back to Home</a>
        </div>` +
        getFooter()
      );
    }
  });
});

// Home route
app.get('/', (req, res) => {
  let html = getHeader('Home');

  html += `
  <div class="jumbotron" data-aos="zoom-in">
    <h1 class="animate__animated animate__fadeInDown"><i class="bi bi-buildings me-2"></i>Urban Pune Database</h1>
    <p class="lead animate__animated animate__fadeInUp">Comprehensive management system for real estate data</p>
    <hr class="my-4 bg-light">
    <p class="animate__animated animate__fadeInUp" style="animation-delay: 0.3s">Browse properties, users, and transactions with ease.</p>
    <a class="btn btn-light btn-lg animate__animated animate__bounceIn" style="animation-delay: 0.5s" href="/filter" role="button">
      <i class="bi bi-search me-2"></i>Start Searching
    </a>
  </div>

  <h2 class="mb-4 text-center" data-aos="fade-up"><i class="bi bi-table me-2"></i>Database Tables</h2>
  <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 mb-5">`;

  tables.forEach((table, index) => {
    html += `
    <div class="col" data-aos="fade-up" data-aos-delay="${index * 100}">
      <div class="card h-100 dashboard-card">
        <div class="card-body">
          <div class="d-flex align-items-center mb-3">
            <div class="dashboard-card-icon">
              <i class="bi bi-${table.icon}"></i>
            </div>
            <h5 class="card-title mb-0 ms-3">${table.title}</h5>
          </div>
          <p class="card-text text-muted">Browse and search the ${table.title.toLowerCase()} data</p>
        </div>
        <div class="card-footer bg-transparent border-0 pb-4">
          <a href="/api/${table.name}" class="btn btn-primary w-100">
            <i class="bi bi-eye me-2"></i>View All
          </a>
        </div>
      </div>
    </div>`;
  });

  html += `
  </div>
  
  <div class="row mt-5">
    <div class="col-md-6" data-aos="fade-right">
      <div class="card mb-4">
        <div class="card-header bg-real-estate text-white">
          <h5 class="mb-0"><i class="bi bi-search me-2"></i>Quick Search</h5>
        </div>
        <div class="card-body">
          <p>Need to find specific information quickly?</p>
          <p>Our advanced search allows you to filter data across all tables with precision.</p>
          <a href="/filter" class="btn btn-primary">
            <i class="bi bi-search me-2"></i>Advanced Search
          </a>
        </div>
      </div>
    </div>
    <div class="col-md-6" data-aos="fade-left">
      <div class="card mb-4">
        <div class="card-header bg-real-estate text-white">
          <h5 class="mb-0"><i class="bi bi-file-earmark-text me-2"></i>User Reports</h5>
        </div>
        <div class="card-body">
          <p>Generate comprehensive reports for any user.</p>
          <p>View properties, favorites, messages, and more in a single dashboard.</p>
          <a href="/user-reports" class="btn btn-primary">
            <i class="bi bi-file-earmark-text me-2"></i>View Reports
          </a>
        </div>
      </div>
    </div>
  </div>
  
  <div class="card mt-5" data-aos="fade-up">
    <div class="card-body p-0">
      <div class="row g-0">
        <div class="col-md-6">
          <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80" 
               class="img-fluid rounded-start h-100" style="object-fit: cover;" alt="Real Estate">
        </div>
        <div class="col-md-6 d-flex align-items-center">
          <div class="p-5">
            <h3 class="mb-4">About Urban Pune Database</h3>
            <p class="mb-4">Our comprehensive real estate database provides detailed information about properties, users, and transactions in Pune. Whether you're a property manager, agent, or analyst, our system offers the tools you need to access and analyze real estate data efficiently.</p>
            <div class="d-flex gap-3 mt-4">
              <div class="text-center">
                <div class="fs-1 fw-bold text-primary mb-2">10+</div>
                <div class="text-muted">Data Tables</div>
              </div>
              <div class="text-center">
                <div class="fs-1 fw-bold text-primary mb-2">1000+</div>
                <div class="text-muted">Properties</div>
              </div>
              <div class="text-center">
                <div class="fs-1 fw-bold text-primary mb-2">500+</div>
                <div class="text-muted">Users</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  html += getFooter();
  res.send(html);
});

// Advanced filter page
app.get('/filter', (req, res) => {
  let html = getHeader('Advanced Search');

  html += `
  <div class="page-header" data-aos="fade-down">
    <div class="container">
      <h2><i class="bi bi-search me-2"></i>Advanced Search</h2>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a href="/">Home</a></li>
          <li class="breadcrumb-item active">Advanced Search</li>
        </ol>
      </nav>
    </div>
  </div>
  
  <div class="card mb-4" data-aos="fade-up">
    <div class="card-header bg-real-estate text-white">
      <h5 class="mb-0"><i class="bi bi-funnel me-2"></i>Search Database Tables</h5>
    </div>
    <div class="card-body">
      <ul class="nav nav-pills mb-4" id="searchTabs" role="tablist">`;

  tables.forEach((table, index) => {
    html += `
    <li class="nav-item" role="presentation" data-aos="fade-right" data-aos-delay="${index * 50}">
      <button
        class="nav-link ${index === 0 ? 'active' : ''}" 
        id="${table.name}-tab" 
        data-bs-toggle="pill" 
        data-bs-target="#${table.name}-content" 
        type="button" 
        role="tab" 
        aria-controls="${table.name}-content" 
        aria-selected="${index === 0}">
        <i class="bi bi-${table.icon} me-1"></i> ${table.title}
      </button>
    </li>`;
  });

  html += `
      </ul>
      
      <div class="tab-content" id="searchTabsContent">`;

  tables.forEach((table, index) => {
    html += `
        <div class="tab-pane fade ${index === 0 ? 'show active' : ''}" 
          id="${table.name}-content" 
          role="tabpanel" 
          aria-labelledby="${table.name}-tab">
          
          <form method="get" action="/api/${table.name}" class="row g-3">
            <div class="col-12" data-aos="fade-up">
              <div class="input-group mb-3">
                <span class="input-group-text bg-real-estate text-white"><i class="bi bi-search"></i></span>
                <input type="text" class="form-control form-control-lg" name="search" placeholder="Search across all fields...">
                <button class="btn btn-primary btn-lg" type="submit">Search</button>
              </div>
            </div>
            
            <hr class="my-3">
            <h6 class="mb-3" data-aos="fade-up">Search by specific fields:</h6>`;

    // Add specific search fields based on table
    table.searchFields.forEach((field, fieldIndex) => {
      html += `
            <div class="col-md-6" data-aos="fade-up" data-aos-delay="${fieldIndex * 50}">
              <div class="form-floating mb-3">
                <input type="text" class="form-control" id="${table.name}_${field}" name="${field}" placeholder="${field}">
                <label for="${table.name}_${field}">${field}</label>
              </div>
            </div>`;
    });

    html += `
            <div class="col-12" data-aos="fade-up">
              <button type="submit" class="btn btn-primary btn-lg">
                <i class="bi bi-search me-2"></i>Search ${table.title}
              </button>
            </div>
          </form>
        </div>`;
  });

  html += `
      </div>
    </div>
  </div>
  
  <div class="card mt-5" data-aos="fade-up">
    <div class="card-header bg-real-estate text-white">
      <h5 class="mb-0"><i class="bi bi-info-circle me-2"></i>Search Tips</h5>
    </div>
    <div class="card-body">
      <div class="row">
        <div class="col-md-4" data-aos="fade-up">
          <div class="d-flex mb-3">
            <div class="me-3 fs-3 text-primary">
              <i class="bi bi-1-circle-fill"></i>
            </div>
            <div>
              <h5>Choose a Table</h5>
              <p class="text-muted">Select which database table you want to search from the tabs above.</p>
            </div>
          </div>
        </div>
        <div class="col-md-4" data-aos="fade-up" data-aos-delay="100">
          <div class="d-flex mb-3">
            <div class="me-3 fs-3 text-primary">
              <i class="bi bi-2-circle-fill"></i>
            </div>
            <div>
              <h5>Enter Search Terms</h5>
              <p class="text-muted">Use the general search or specific field filters to narrow down results.</p>
            </div>
          </div>
        </div>
        <div class="col-md-4" data-aos="fade-up" data-aos-delay="200">
          <div class="d-flex mb-3">
            <div class="me-3 fs-3 text-primary">
              <i class="bi bi-3-circle-fill"></i>
            </div>
            <div>
              <h5>View Results</h5>
              <p class="text-muted">Browse through the filtered data in an easy-to-read table format.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  html += getFooter();
  res.send(html);
});

// User reports page - FIXED to match schema
app.get('/user-reports', async (req, res) => {
  try {
    const usersResult = await client.query('SELECT u_id, name FROM users ORDER BY name');

    let html = getHeader('User Reports');

    html += `
    <div class="page-header" data-aos="fade-down">
      <div class="container">
        <h2><i class="bi bi-file-earmark-text me-2"></i>User Reports</h2>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a href="/">Home</a></li>
            <li class="breadcrumb-item active">User Reports</li>
          </ol>
        </nav>
      </div>
    </div>
    
    <div class="card mb-4" data-aos="fade-up">
      <div class="card-header bg-real-estate text-white">
        <h5 class="mb-0"><i class="bi bi-people me-2"></i>Select User</h5>
      </div>
      <div class="card-body">
        <p class="text-muted mb-4">Select a user to generate a comprehensive report including their properties, favorites, messages, and more.</p>
        
        <form method="get" action="/user-report" class="row g-3">
          <div class="col-md-8" data-aos="fade-right">
            <select id="userId" name="userId" class="form-select form-select-lg" required>
              <option value="">-- Select a User --</option>`;

    usersResult.rows.forEach(user => {
      html += `<option value="${user.u_id}">${user.name} (ID: ${user.u_id})</option>`;
    });

    html += `
            </select>
          </div>
          <div class="col-md-4" data-aos="fade-left">
            <button type="submit" class="btn btn-primary btn-lg w-100">
              <i class="bi bi-file-earmark-text me-2"></i>Generate Report
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <div class="row mt-5">
      <div class="col-md-6" data-aos="fade-up">
        <div class="card h-100">
          <div class="card-body text-center p-5">
            <i class="bi bi-file-earmark-text text-primary" style="font-size: 4rem;"></i>
            <h3 class="mt-4">Comprehensive Reports</h3>
            <p class="text-muted">Get detailed information about users, their properties, and interactions in one place.</p>
          </div>
        </div>
      </div>
      <div class="col-md-6" data-aos="fade-up" data-aos-delay="100">
        <div class="card h-100">
          <div class="card-body text-center p-5">
            <i class="bi bi-graph-up text-primary" style="font-size: 4rem;"></i>
            <h3 class="mt-4">Data Visualization</h3>
            <p class="text-muted">View user data in an organized, easy-to-understand format with visual elements.</p>
          </div>
        </div>
      </div>
    </div>`;

    html += getFooter();
    res.send(html);
  } catch (err) {
    res.status(500).send(
      getHeader('Error') +
      `<div class="alert alert-danger my-4" role="alert" data-aos="fade-up">
        <h4 class="alert-heading"><i class="bi bi-exclamation-triangle me-2"></i>Error</h4>
        <p>${err.message}</p>
        <hr>
        <a href="/" class="btn btn-outline-danger">Back to Home</a>
      </div>` +
      getFooter()
    );
  }
});

// Individual user report - FIXED to match schema
app.get('/user-report', async (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.redirect('/user-reports');
  }

  try {
    // Get user details
    const userResult = await client.query('SELECT * FROM users WHERE u_id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).send(
        getHeader('User Not Found') +
        `<div class="alert alert-warning my-4" role="alert" data-aos="fade-up">
          <h4 class="alert-heading"><i class="bi bi-exclamation-triangle me-2"></i>User Not Found</h4>
          <p>No user found with ID: ${userId}</p>
          <hr>
          <a href="/user-reports" class="btn btn-outline-warning">Back to User Reports</a>
        </div>` +
        getFooter()
      );
    }

    const user = userResult.rows[0];

    // Get user's properties (if user is an owner)
    const propertiesResult = await client.query(
      'SELECT * FROM properties WHERE owner_id = $1',
      [userId]
    );

    // Get user's favorites
    const favoritesResult = await client.query(
      'SELECT f.*, p.title, p.rent FROM favorites f ' +
      'JOIN properties p ON f.property_id = p.p_id ' +
      'WHERE f.user_id = $1',
      [userId]
    );

    // Get user's messages
    const messagesResult = await client.query(
      'SELECT m.*, u.name as receiver_name FROM messages m ' +
      'JOIN users u ON m.receiver_id = u.u_id ' +
      'WHERE m.sender_id = $1 ' +
      'ORDER BY m.sent_at DESC',
      [userId]
    );

    // Get user's enquiries
    const enquiriesResult = await client.query(
      'SELECT e.*, p.title FROM enquiries e ' +
      'JOIN properties p ON e.property_id = p.p_id ' +
      'WHERE e.user_id = $1 ' +
      'ORDER BY e.created_at DESC',
      [userId]
    );

    // Get user's payments
    const paymentsResult = await client.query(
      'SELECT pay.*, p.title FROM payments pay ' +
      'JOIN properties p ON pay.property_id = p.p_id ' +
      'WHERE pay.user_id = $1 ' +
      'ORDER BY pay.payment_date DESC',
      [userId]
    );

    // Get user's ratings
    const ratingsResult = await client.query(
      'SELECT r.*, p.title FROM ratings r ' +
      'JOIN properties p ON r.property_id = p.p_id ' +
      'WHERE r.user_id = $1 ' +
      'ORDER BY r.created_at DESC',
      [userId]
    );

    let html = getHeader(`User Report: ${user.name}`);

    html += `
    <div class="page-header" data-aos="fade-down">
      <div class="container">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2><i class="bi bi-person-badge me-2"></i>User Report: ${user.name}</h2>
            <nav aria-label="breadcrumb">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="/">Home</a></li>
                <li class="breadcrumb-item"><a href="/user-reports">User Reports</a></li>
                <li class="breadcrumb-item active">${user.name}</li>
              </ol>
            </nav>
          </div>
          <a href="/user-reports" class="btn btn-outline-primary">
            <i class="bi bi-arrow-left me-2"></i>Back to User Reports
          </a>
        </div>
      </div>
    </div>
    
    <div class="row">
      <div class="col-lg-4 mb-4" data-aos="fade-right">
        <div class="card profile-card h-100">
          <div class="card-body">
            <div class="text-center mb-4">
              <div class="avatar-placeholder mb-3">
                <i class="bi bi-person-fill" style="font-size: 3rem;"></i>
              </div>
              <h3 class="mb-2">${user.name}</h3>
              <div class="mb-3">
                <span class="badge bg-${user.user_type === 'owner' ? 'success' : 'primary'} user-badge">
                  <i class="bi bi-${user.user_type === 'owner' ? 'house-fill' : 'person-fill'} me-1"></i>
                  ${user.user_type}
                </span>
                <span class="badge bg-${user.status === 'active' ? 'success' : 'danger'} user-badge">
                  <i class="bi bi-${user.status === 'active' ? 'check-circle-fill' : 'x-circle-fill'} me-1"></i>
                  ${user.status}
                </span>
              </div>
            </div>
            
            <h5 class="border-bottom pb-2 mb-3">Contact Information</h5>
            <div class="user-info-item">
              <div class="d-flex">
                <div class="user-info-icon">
                  <i class="bi bi-envelope"></i>
                </div>
                <div>
                  <div class="fw-bold">Email</div>
                  <div>${user.email || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            <div class="user-info-item">
              <div class="d-flex">
                <div class="user-info-icon">
                  <i class="bi bi-telephone"></i>
                </div>
                <div>
                  <div class="fw-bold">Phone</div>
                  <div>${user.phone || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            <h5 class="border-bottom pb-2 mb-3 mt-4">Account Details</h5>
            <div class="user-info-item">
              <div class="d-flex">
                <div class="user-info-icon">
                  <i class="bi bi-person-badge"></i>
                </div>
                <div>
                  <div class="fw-bold">User ID</div>
                  <div>${user.u_id}</div>
                </div>
              </div>
            </div>
            
            <div class="user-info-item">
              <div class="d-flex">
                <div class="user-info-icon">
                  <i class="bi bi-calendar-date"></i>
                </div>
                <div>
                  <div class="fw-bold">Registered On</div>
                  <div>${new Date(user.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            
            <div class="mt-4">
              <div class="d-grid gap-2">
                <button class="btn btn-primary">
                  <i class="bi bi-envelope me-2"></i>Contact User
                </button>
                <button class="btn btn-outline-primary">
                  <i class="bi bi-printer me-2"></i>Print Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-lg-8" data-aos="fade-left">
        <div class="card mb-4">
          <div class="card-header bg-real-estate text-white">
            <h5 class="mb-0"><i class="bi bi-clipboard-data me-2"></i>User Activity Summary</h5>
          </div>
          <div class="card-body">
            <div class="row text-center">
              <div class="col-md-4 mb-3">
                <div class="p-3 rounded" style="background-color: rgba(58, 12, 163, 0.1);">
                  <div class="fs-1 fw-bold text-primary">${propertiesResult.rows.length}</div>
                  <div>Properties</div>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <div class="p-3 rounded" style="background-color: rgba(76, 201, 240, 0.1);">
                  <div class="fs-1 fw-bold text-primary">${favoritesResult.rows.length}</div>
                  <div>Favorites</div>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <div class="p-3 rounded" style="background-color: rgba(247, 37, 133, 0.1);">
                  <div class="fs-1 fw-bold text-primary">${messagesResult.rows.length + enquiriesResult.rows.length}</div>
                  <div>Communications</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <ul class="nav nav-tabs mb-4" id="userReportTab" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="properties-tab" data-bs-toggle="tab" data-bs-target="#properties" type="button" role="tab" aria-controls="properties" aria-selected="true">
              <i class="bi bi-house me-1"></i> Properties
              <span class="badge bg-secondary ms-1">${propertiesResult.rows.length}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="favorites-tab" data-bs-toggle="tab" data-bs-target="#favorites" type="button" role="tab" aria-controls="favorites" aria-selected="false">
              <i class="bi bi-heart me-1"></i> Favorites
              <span class="badge bg-secondary ms-1">${favoritesResult.rows.length}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="messages-tab" data-bs-toggle="tab" data-bs-target="#messages" type="button" role="tab" aria-controls="messages" aria-selected="false">
              <i class="bi bi-chat me-1"></i> Messages
              <span  aria-selected="false">
              <i class="bi bi-chat me-1"></i> Messages
              <span class="badge bg-secondary ms-1">${messagesResult.rows.length}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="enquiries-tab" data-bs-toggle="tab" data-bs-target="#enquiries" type="button" role="tab" aria-controls="enquiries" aria-selected="false">
              <i class="bi bi-question-circle me-1"></i> Enquiries
              <span class="badge bg-secondary ms-1">${enquiriesResult.rows.length}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="payments-tab" data-bs-toggle="tab" data-bs-target="#payments" type="button" role="tab" aria-controls="payments" aria-selected="false">
              <i class="bi bi-credit-card me-1"></i> Payments
              <span class="badge bg-secondary ms-1">${paymentsResult.rows.length}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="ratings-tab" data-bs-toggle="tab" data-bs-target="#ratings" type="button" role="tab" aria-controls="ratings" aria-selected="false">
              <i class="bi bi-star me-1"></i> Ratings
              <span class="badge bg-secondary ms-1">${ratingsResult.rows.length}</span>
            </button>
          </li>
        </ul>
        
        <div class="tab-content" id="userReportTabContent">
          <div class="tab-pane fade show active" id="properties" role="tabpanel" aria-labelledby="properties-tab">
            ${formatAsTable(propertiesResult.rows, 'Properties', false)}
          </div>
          <div class="tab-pane fade" id="favorites" role="tabpanel" aria-labelledby="favorites-tab">
            ${formatAsTable(favoritesResult.rows, 'Favorites', false)}
          </div>
          <div class="tab-pane fade" id="messages" role="tabpanel" aria-labelledby="messages-tab">
            ${formatAsTable(messagesResult.rows, 'Messages', false)}
          </div>
          <div class="tab-pane fade" id="enquiries" role="tabpanel" aria-labelledby="enquiries-tab">
            ${formatAsTable(enquiriesResult.rows, 'Enquiries', false)}
          </div>
          <div class="tab-pane fade" id="payments" role="tabpanel" aria-labelledby="payments-tab">
            ${formatAsTable(paymentsResult.rows, 'Payments', false)}
          </div>
          <div class="tab-pane fade" id="ratings" role="tabpanel" aria-labelledby="ratings-tab">
            ${formatAsTable(ratingsResult.rows, 'Ratings', false)}
          </div>
        </div>
      </div>
    </div>`;

    html += getFooter();
    res.send(html);
  } catch (err) {
    res.status(500).send(
      getHeader('Error') +
      `<div class="alert alert-danger my-4" role="alert" data-aos="fade-up">
        <h4 class="alert-heading"><i class="bi bi-exclamation-triangle me-2"></i>Error</h4>
        <p>${err.message}</p>
        <hr>
        <a href="/user-reports" class="btn btn-outline-danger">Back to User Reports</a>
      </div>` +
      getFooter()
    );
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});