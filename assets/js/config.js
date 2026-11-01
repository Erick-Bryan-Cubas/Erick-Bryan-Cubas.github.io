/*
 * Everything personal lives here. Edit this file to update the site:
 * the page sections, the terminal commands and the SQL tables all read from it.
 */
window.SITE = {
  name: 'Erick Bryan Cubas',
  firstName: 'Erick',
  user: 'erick',
  host: 'datasage',
  github: 'Erick-Bryan-Cubas',
  role: 'Data Analyst & Data Engineer',
  education: 'Data Science @ FIAP',
  location: 'Goiânia, GO · Brazil',

  // Typed and erased in a loop on the terminal's status line.
  rotating: [
    'building data pipelines',
    'modeling semantic layers',
    'writing DAX measures',
    'studying for DP-700',
    'turning data into decisions',
  ],

  about: [
    "I'm Erick, a Data Analyst & Data Engineer from Goiânia, Brazil, currently studying Data Science at FIAP.",
    'I build the path from raw data to decisions: ingestion and ETL pipelines, relational and dimensional models, and Power BI semantic models and reports people actually use.',
    'Lately I have been exploring LLM-powered tools — Text-to-SQL, AI flashcard generation — and preparing for the Microsoft Fabric certifications.',
  ],

  links: [
    { key: 'github', label: 'GitHub', url: 'https://github.com/Erick-Bryan-Cubas', icon: 'github' },
    { key: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/the-bryan/', icon: 'linkedin' },
    { key: 'email', label: 'Email', url: 'mailto:datasageanalytics@gmail.com', text: 'datasageanalytics@gmail.com', icon: 'mail' },
    { key: 'website', label: 'DataSage', url: 'https://datasageanalytics.cloud/', icon: 'globe' },
    { key: 'dio', label: 'DIO', url: 'https://www.dio.me/users/thecubas', icon: 'school' },
  ],

  // level: 1 = familiar · 2 = comfortable · 3 = strong
  stack: [
    {
      key: 'data', name: 'Data Science & Analytics', icon: 'chart',
      items: [
        { name: 'Power BI', level: 3, logo: 'https://raw.githubusercontent.com/microsoft/PowerBI-Icons/24f1db8bdfab951c25db591772140d2f4ec5bc1e/SVG/Power-BI.svg' },
        { name: 'Python', level: 2, logo: devicon('python/python-original.svg') },
        { name: 'Go', level: 1, logo: devicon('go/go-original-wordmark.svg') },
        { name: 'R', level: 1, logo: devicon('r/r-original.svg') },
        { name: 'Anaconda', level: 1, logo: devicon('anaconda/anaconda-original.svg') },
        { name: 'LaTeX', level: 1, logo: devicon('latex/latex-original.svg') },
      ],
    },
    {
      key: 'cloud', name: 'Cloud Computing', icon: 'cloud',
      items: [
        { name: 'AWS', level: 1, logo: devicon('amazonwebservices/amazonwebservices-original.svg') },
        { name: 'Azure', level: 1, logo: devicon('azure/azure-original.svg') },
        { name: 'Oracle Cloud', level: 1, logo: devicon('oracle/oracle-original.svg') },
        { name: 'GCP', level: 1, logo: devicon('googlecloud/googlecloud-original.svg') },
      ],
    },
    {
      key: 'db', name: 'Databases & Modeling', icon: 'database',
      items: [
        { name: 'MySQL', level: 3, logo: devicon('mysql/mysql-original.svg') },
        { name: 'PostgreSQL', level: 3, logo: devicon('postgresql/postgresql-original.svg') },
        { name: 'Oracle DB', level: 1, logo: devicon('oracle/oracle-original.svg') },
        { name: 'MongoDB', level: 1, logo: devicon('mongodb/mongodb-original.svg') },
        { name: 'Redis', level: 1, logo: devicon('redis/redis-original.svg') },
        { name: 'Docker', level: 2, logo: devicon('docker/docker-original.svg') },
      ],
    },
    {
      key: 'web', name: 'Web, Git & APIs', icon: 'code',
      items: [
        { name: 'Git', level: 2, logo: devicon('git/git-original.svg') },
        { name: 'Django', level: 2, logo: devicon('django/django-plain.svg') },
        { name: 'Flask', level: 2, logo: devicon('flask/flask-original.svg') },
        { name: 'Figma', level: 2, logo: devicon('figma/figma-original.svg') },
        { name: 'Vue.js', level: 1, logo: devicon('vuejs/vuejs-original.svg') },
        { name: 'HTML', level: 1, logo: devicon('html5/html5-original.svg') },
        { name: 'CSS', level: 1, logo: devicon('css3/css3-original.svg') },
        { name: 'Nginx', level: 1, logo: devicon('nginx/nginx-original.svg') },
      ],
    },
    {
      key: 'iot', name: 'IoT & Systems', icon: 'chip',
      items: [
        { name: 'Linux', level: 3, logo: devicon('linux/linux-original.svg') },
        { name: 'PuTTY', level: 2, logo: devicon('putty/putty-original.svg') },
        { name: 'C', level: 1, logo: devicon('c/c-original.svg') },
        { name: 'C++', level: 1, logo: devicon('cplusplus/cplusplus-original.svg') },
        { name: 'Arduino', level: 1, logo: devicon('arduino/arduino-original.svg') },
        { name: 'Apache', level: 1, logo: devicon('apache/apache-original.svg') },
      ],
    },
  ],

  certifications: [
    {
      code: 'AIF-C01', name: 'AWS Certified AI Practitioner', issuer: 'Amazon Web Services', status: 'earned',
      image: 'assets/img/certs/AIF-C01.png',
      url: 'https://cp.certmetrics.com/amazon/en/public/verify/credential/6bc96c05fa404e128fb28ccf93898de6',
    },
    {
      code: 'CLF-C01', name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', status: 'earned',
      image: 'assets/img/certs/CLF-C01.png',
      url: 'https://www.credly.com/badges/9b70a9d0-9f50-4f83-bc83-df5e66d25b82/linked_in_profile',
    },
    {
      code: 'OCI-FND-25', name: 'OCI 2025 Certified Foundations Associate', issuer: 'Oracle', status: 'earned',
      image: 'assets/img/certs/OCI25FNDCFAV1.png',
      url: 'https://catalog-education.oracle.com/ords/certview/sharebadge?id=5D5B276BA7264677BFD1023FC42C6FD6DAA35A6365464B538D028068243DA286',
    },
    {
      code: 'PL-300', name: 'Power BI Data Analyst Associate', issuer: 'Microsoft', status: 'in progress',
      image: 'assets/img/certs/Power-BI-Data-Analyst-Associate-Badge.png',
    },
    {
      code: 'DP-600', name: 'Fabric Analytics Engineer Associate', issuer: 'Microsoft', status: 'in progress',
      image: 'assets/img/certs/Fabric-Analytics-Engineer-Associate-Badge.png',
    },
    {
      code: 'DP-700', name: 'Fabric Data Engineer Associate', issuer: 'Microsoft', status: 'in progress',
      image: 'assets/img/certs/Fabric-Data-Engineer-Associate-Badge.png',
    },
  ],

  // Shown first in "Projects", in this order. Live stars/language come from the
  // GitHub API; the fields below are the fallback if the API is unreachable.
  featured: [
    {
      name: 'green-deck', language: 'Vue',
      description: 'AI-powered flashcard generator: turns text, PDFs and documents into Anki cards using local LLMs (Ollama) or hosted providers.',
      tags: ['LLM', 'FastAPI', 'Vue 3', 'DuckDB', 'Anki'],
    },
    {
      name: 'nucleai-prod', language: 'TypeScript',
      description: 'Text-to-SQL platform built on WrenAI: ask your database questions in plain language. LLM observability via Langfuse and AWS deploy with Terraform.',
      tags: ['Text-to-SQL', 'LLM', 'Terraform', 'AWS'],
    },
    {
      name: 'green-sat', language: 'Python',
      description: 'Satellite climate-intelligence pipeline that processes NASA POWER data for every Brazilian municipality.',
      tags: ['Data pipeline', 'NASA POWER', 'Climate'],
    },
    {
      name: 'PythonVsGo-FileManipulation', language: 'Go',
      description: 'Benchmark of Python vs Go on Excel workloads (concatenation, cumulative sums, reads): elapsed time, CPU and memory.',
      tags: ['Benchmark', 'Go', 'Python'],
    },
    {
      name: 'django-apache-nginx-uwsgi-vps-ubuntu', language: 'Python',
      description: 'Step-by-step guide to deploy a Django app on an Ubuntu VPS with Apache, NGINX and uWSGI.',
      tags: ['Django', 'DevOps', 'Linux'],
    },
  ],

  // Hidden from the repository browser, the terminal and the SQL `projects` table.
  hiddenRepos: [
    'Erick-Bryan-Cubas',
    'Erick-Bryan-Cubas.github.io',
    'Contador_Ana',
    'teste-candidatura-cilia-tecnologia',
  ],
};

function devicon(path) {
  return 'https://raw.githubusercontent.com/devicons/devicon/master/icons/' + path;
}
