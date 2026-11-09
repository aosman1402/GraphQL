# 01Founders GraphQL Profile

## Overview

The 01Founders GraphQL Profile is a web application that allows students to log in using their 01Founders credentials and view their personal school data.

The application retrieves information from the 01Founders GraphQL API and presents it through a profile dashboard with statistics and SVG visualisations.

## Features

### Authentication
- Log in using 01Founders credentials.
- Authenticate through the 01Founders authentication API.
- Store the returned JWT for authenticated GraphQL requests.
- Log out and clear the stored authentication token.
- Display an error message if authentication fails.

### Student Profile

The profile dashboard displays:
- Username
- Student ID
- Total XP
- Audit ratio
- Campus

### Statistics and Graphs

The application includes the following visualisations:

**1. Audit Ratio**
- Displays audits given compared with audits received.
- Shows the student's audit ratio.
- Uses an SVG chart to represent the data.

**2. Project PASS/FAIL**
- Displays project pass and fail results.
- Shows the total number of results.
- Calculates the project pass percentage.
- Uses an SVG chart to visualise the results.

**3. Piscine Performance**
- Displays JavaScript and Go Piscine exercise performance.
- Shows passed and failed exercises.
- Uses an SVG chart to represent the results.

**4. Attempts per Exercise**
- Displays the number of attempts made for each Piscine exercise.
- Uses an SVG chart to compare attempts.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- GraphQL
- SVG

No external charting library is required for the visualisations.

## API

The application uses the following 01Founders endpoints.

**Authentication**

`https://learn.01founders.co/api/auth/signin`

Used to authenticate students and obtain a JWT.

**GraphQL**

`https://learn.01founders.co/api/graphql-engine/v1/graphql`

Used to retrieve student profile information, audit data, project results and Piscine progress.

Authenticated GraphQL requests include the JWT in the request header:

`Authorization: Bearer <JWT>`

## Project Structure

```text
graphql-profile/
│
├── index.html
├── style.css
├── app.js
└── README.md
```

| File | Description |
|---|---|
| `index.html` | Application structure and dashboard layout |
| `style.css` | Styling and responsive layout |
| `app.js` | Authentication, GraphQL requests and chart rendering |
| `README.md` | Project documentation |

## Getting Started

### Prerequisites

- An active 01Founders student account.
- A modern web browser.
- Python 3 or another local HTTP server.

### Installation

1. Clone or download the project repository.

2. Open the project folder in your terminal.

3. Start a local development server:

```bash
python3 -m http.server 8000
```

4. Open the application in your browser:

```text
http://localhost:8000
```

5. Log in using your 01Founders username and password.

6. Once authenticated, the application loads your profile and statistics.

## Responsive Design

The application is designed to work across different screen sizes, including desktop, tablet and mobile devices.

The layout adjusts to smaller screens to keep the profile information and graphs accessible.

## Security

- User credentials are submitted through an HTTP POST request rather than being placed in the URL.
- Authenticated GraphQL requests use a JWT.
- The application does not include hardcoded student credentials.
- Users can log out to clear their stored authentication token.

**Note:** The JWT is stored in browser local storage for this project. Avoid using the application on shared or untrusted devices.

## Author

01Founders Student Project