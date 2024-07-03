document.addEventListener('DOMContentLoaded', () => {
    const userIdInput = document.getElementById('userId');
    const calculationMethodSelect = document.getElementById('calculationMethod');
    const resultDiv = document.getElementById('result');
    const userDataElement = document.getElementById('userData');
    const sgpaResultsDiv = document.getElementById('sgpa-results');
    const cgpaResultsDiv = document.getElementById('cgpa-results');

    async function fetchOrgUnitIds() {
        const userId = userIdInput.value.trim();
        if (!userId) {
            alert('Please enter a valid User ID.');
            return null;
        }

        resultDiv.innerHTML = ''; // Clear previous results
        userDataElement.innerHTML = ''; // Clear previous user data
        sgpaResultsDiv.innerHTML = ''; // Clear previous SGPA results
        cgpaResultsDiv.innerHTML = ''; // Clear previous CGPA results
   
       // const apiToken =  //API token
        const apiUrl = `https://acadlms.d2l-partners.brightspace.com/d2l/api/lp/1.43/enrollments/users/${userId}/orgunits/`;

        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const orgUnitIds = data.Items.map(item => item.OrgUnit.Id);

            let allGrades = [];
            for (let i = 0; i < orgUnitIds.length; i++) {
                const orgId = orgUnitIds[i];
                const grades = await fetchGrades(orgId, userId, apiToken);
                const courseName = await fetchCourseName(orgId, apiToken);
                if (grades) {
                    allGrades.push({ orgId, courseName, grades });
                }
            }

            if (allGrades.length === 0) {
                userDataElement.innerHTML = '<p>The user does not have any valid grades assigned.</p>';
            } else {
                displayUserData(allGrades);
                const calculationMethod = calculationMethodSelect.value;
                const { sgpa, cgpa } = calculateSGPACGPA(allGrades, calculationMethod); // Calculate SGPA and CGPA
                displaySGPA(sgpa); // Display SGPA in sgpaResultsDiv
                displayCGPA(cgpa); // Display CGPA in cgpaResultsDiv
            }

            return allGrades; // Return data for further use

        } catch (error) {
            console.error('Error fetching org unit IDs:', error);
            resultDiv.innerHTML = `<p>Error fetching org unit IDs. Please try again.</p>`;
            return null;
        }
    }

    async function fetchGrades(orgId, userId, apiToken) {
        const gradeUrl = `https://acadlms.d2l-partners.brightspace.com/d2l/api/le/1.43/${orgId}/grades/final/values/${userId}`;

        try {
            const response = await fetch(gradeUrl, {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const gradeData = await response.json();
            return gradeData;

        } catch (error) {
            console.error('Error fetching grades:', error);
            return null;
        }
    }

    async function fetchCourseName(orgId, apiToken) {
        const courseUrl = `https://acadlms.d2l-partners.brightspace.com/d2l/api/lp/1.43/orgstructure/${orgId}`;

        try {
            const response = await fetch(courseUrl, {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const courseData = await response.json();
            return courseData.Name || 'N/A';

        } catch (error) {
            console.error('Error fetching course name:', error);
            return 'N/A';
        }
    }

    function displayUserData(allGrades) {
        let htmlContent = '<h3>User Grades:</h3>';

        allGrades.forEach(item => {
            const orgId = item.orgId;
            const courseName = item.courseName;
            const grades = item.grades;

            htmlContent += `<h4>Course: ${courseName}<div class="org-id">Org Unit ID: ${orgId}</div></h4>`;
            if (grades && grades.DisplayedGrade !== undefined && grades.PointsNumerator !== undefined) {
                const displayedGrade = grades.DisplayedGrade || 'No Grades Assigned yet';
                htmlContent += `<p>Grade: ${displayedGrade}</p>`;
            } else {
                htmlContent += `<p>No grades available for this course.</p>`;
            }
        });

        userDataElement.innerHTML = htmlContent;
    }

    function percentageToGradePoint(percentage) {
        if (percentage >= 90) {
            return 4.0;
        } else if (percentage >= 80) {
            return 3.0;
        } else if (percentage >= 70) {
            return 2.0;
        } else if (percentage >= 60) {
            return 1.0;
        } else {
            return 0.0;
        }
    }

    function calculateSGPACGPA(allGrades, method) {
        let totalSGPA = 0;
        let totalCredits = 0;
        let totalCGPA = 0;
        let totalCourses = 0;

        allGrades.forEach(item => {
            const percentage = parseFloat(item.grades.DisplayedGrade);
            const gradePoint = method === 'percentage' ? percentage / 25 : percentageToGradePoint(percentage);
            totalSGPA += gradePoint;
            totalCredits += 1; // Assuming each course is worth 1 credit
            totalCGPA += gradePoint;
            totalCourses++;
        });

        const sgpa = totalSGPA / totalCredits;
        const cgpa = totalCGPA / totalCourses;

        console.log(`SGPA: ${sgpa}, CGPA: ${cgpa}`);

        return { sgpa, cgpa };
    }

    function displaySGPA(sgpa) {
        sgpaResultsDiv.innerHTML = `
            <h4>Calculated SGPA:</h4>
            <p>SGPA: ${sgpa.toFixed(2)}</p>
        `;
    }

    function displayCGPA(cgpa) {
        cgpaResultsDiv.innerHTML = `
            <h4>Calculated CGPA:</h4>
            <p>CGPA: ${cgpa.toFixed(2)}</p>
        `;
    }

    const fetchBtn = document.getElementById('fetchBtn');
    if (fetchBtn) {
        fetchBtn.addEventListener('click', async () => {
            const allGrades = await fetchOrgUnitIds();
            if (allGrades) {
                const calculationMethod = calculationMethodSelect.value;
                const { sgpa, cgpa } = calculateSGPACGPA(allGrades, calculationMethod);
                displaySGPA(sgpa); // Display SGPA after fetching data
                displayCGPA(cgpa); // Display CGPA after fetching data
            }
        });
    }
});
