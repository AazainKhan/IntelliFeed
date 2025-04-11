# IntelliFeed

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/aazain/IntelliFeed">
<img width="428" alt="Screenshot 2025-04-11 at 3 39 48 AM" src="https://github.com/user-attachments/assets/4ed230a9-6307-40f1-b9bd-ef1e9dab373f"/>  
  </a>


<h3 align="center">IntelliFeed</h3>

  <p align="center">
    A smart and customizable rss news feed aggregator.
    <br />
    <a href="https://github.com/aazain/IntelliFeed">View Demo</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#contributing">Contributing</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

<img width="600" alt="Screenshot 2025-04-11 at 3 42 56 AM" src="https://github.com/user-attachments/assets/8290bf69-5579-495b-a477-3c06790ce0cc"/>

<br>
<br>

<img width="600" alt="Screenshot 2025-04-11 at 3 42 56 AM" src="https://github.com/user-attachments/assets/8c016d7c-a65a-4d9f-a06e-ab45d040181d"/>


<br>
<br>


IntelliFeed is a smart rss news feed aggregator designed to help users consolidate and customize content from multiple sources into a single, easy-to-use interface

<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Built With

[![React][React.js]][React-url]
[![Node.js][Node.js]][Node-url]
[![Python][Python]][Python-url]
[![Chalice][Chalice]][Chalice-url]
[![AWS][AWS]][AWS-url]
[![Shadcn][Shadcn]][Shadcn-url]
[![Tailwind][Tailwind]][Tailwind-url]
<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

Follow these instructions to set up IntelliFeed locally.

### Prerequisites

Ensure you have the following installed:
* npm
  ```sh
  npm install npm@latest -g
  ```
* Node.js
  ```sh
    node -v
    ```
* Python 3.x
  ```sh
    python --version
    ```
* AWS CLI
  ```sh
    aws --version
    ```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/aazain/IntelliFeed.git
   ```
2. cd into backend directory
   ```sh
   cd backend
   ```
3. Install Python dependencies usign pipenv
   ```sh
    pipenv install
    ```
4. cd into frontend directory
    ```sh
    cd ../frontend
    ```
5. Install Node.js dependencies 
    ```sh
   npm install
    ```

### Run the Application
1. from project root go into backend directory
   ```sh
   cd backend
   ```
2. activate the pipenv shell
   ```sh
   pipenv shell
   ```
3. Run the backend server
   ```sh
    chalice local
    ```
4. cd into frontend directory
    ```sh
    cd ../frontend
    ```
5. Run the frontend development server
    ```sh
    npm run dev
    ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- CONTRIBUTING -->
## Contributing for my team

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[product-screenshot]: images/screenshot.png
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Node.js]: https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
[Python]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/
[Chalice]: https://img.shields.io/badge/Chalice-FF4B00?style=for-the-badge&logo=aws&logoColor=white
[Chalice-url]: https://aws.amazon.com/chalice/
[AWS]: https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white
[AWS-url]: https://aws.amazon.com/
[Shadcn]: https://img.shields.io/badge/Shadcn-000000?style=for-the-badge&logo=shadcn&logoColor=white
[Shadcn-url]: https://shadcn.dev/
[Tailwind]: https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/