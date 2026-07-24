console.log("FCC script loaded");


const form = document.getElementById("registrationForm");


if (form) {


    form.addEventListener("submit", async (event) => {


        event.preventDefault();



        const member = {


            firstName: document.getElementById("firstName").value,


            lastName: document.getElementById("lastName").value,


            yearOfStudy: document.getElementById("yearOfStudy").value,


            programOfStudy: document.getElementById("programOfStudy").value,


            email: document.getElementById("email").value,


            password: document.getElementById("password").value,


            agreedMission: document.getElementById("agree").checked


        };



        console.log("Sending data:", member);




        try {



            const response = await fetch(
                "https://YOUR-RENDER-APP-NAME.onrender.com/register",
                {


                method:"POST",


                headers:{


                    "Content-Type":"application/json"


                },


                body:JSON.stringify(member)


            });





            const data = await response.json();




            console.log("Server response:", data);





            if(response.ok){



                alert("Registration successful!");



                window.location.href="success.html";



            } else {



                alert(data.message || "Registration failed");



            }





        } catch(error){



            console.error("Registration error:", error);



            alert("Unable to connect to server");



        }



    });



} else {



    console.error("Registration form not found");


}