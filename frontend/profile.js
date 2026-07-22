// =======================================
// GET LOGGED IN MEMBER
// =======================================

const member = JSON.parse(localStorage.getItem("member"));


if (!member) {

    window.location.href = "login.html";

}


// =======================================
// DISPLAY MEMBER DETAILS
// =======================================

document.getElementById("firstName").textContent =
member.firstName || "";


document.getElementById("lastName").textContent =
member.lastName || "";


document.getElementById("email").textContent =
member.email || "";


document.getElementById("programme").textContent =
member.programOfStudy || "Computer Science";


document.getElementById("year").textContent =
member.yearOfStudy || "Year 4";


document.getElementById("memberNumber").textContent =
member.memberNumber || "FCC-2026-" + member.id;



// =======================================
// LOGOUT
// =======================================

document.getElementById("logoutBtn").addEventListener("click",()=>{


    localStorage.removeItem("member");


    window.location.href="login.html";


});





// =======================================
// MODALS
// =======================================

const editModal =
document.getElementById("editProfileModal");


const passwordModal =
document.getElementById("changePasswordModal");




// =======================================
// OPEN EDIT PROFILE MODAL
// =======================================

document
.getElementById("editProfile")
.addEventListener("click",()=>{


    document.getElementById("editFirstName").value =
    member.firstName || "";


    document.getElementById("editLastName").value =
    member.lastName || "";


    document.getElementById("editProgramme").value =
    member.programOfStudy || "";


    document.getElementById("editYear").value =
    member.yearOfStudy || "";



    editModal.style.display="flex";


});





// =======================================
// OPEN CHANGE PASSWORD MODAL
// =======================================

document
.getElementById("changePassword")
.addEventListener("click",()=>{


    passwordModal.style.display="flex";


});





// =======================================
// CLOSE MODALS
// =======================================

document
.querySelectorAll(".closeModal")
.forEach(button=>{


    button.addEventListener("click",()=>{


        editModal.style.display="none";


        passwordModal.style.display="none";


    });


});






// =======================================
// UPDATE PROFILE
// =======================================

document
.getElementById("editProfileForm")
.addEventListener("submit",async(e)=>{


    e.preventDefault();



    const updatedMember={


        email:member.email,


        firstName:
        document.getElementById("editFirstName").value,


        lastName:
        document.getElementById("editLastName").value,


        programOfStudy:
        document.getElementById("editProgramme").value,


        yearOfStudy:
        document.getElementById("editYear").value



    };




    try{


        const response=await fetch(
            "http://localhost:3000/update-profile",
            {

                method:"PUT",

                headers:{

                    "Content-Type":"application/json"

                },


                body:JSON.stringify(updatedMember)

            }

        );



        const result=await response.json();



        alert(result.message);




        if(response.ok){


            const newMember={

                ...member,

                ...updatedMember

            };



            localStorage.setItem(

                "member",

                JSON.stringify(newMember)

            );



            location.reload();


        }



    }

    catch(error){


        console.log(error);


        alert(
            "Server connection failed"
        );


    }




});







// =======================================
// CHANGE PASSWORD
// =======================================

document
.getElementById("changePasswordForm")
.addEventListener("submit",async(e)=>{


    e.preventDefault();



    const currentPassword =
    document.getElementById("currentPassword").value;



    const newPassword =
    document.getElementById("newPassword").value;



    const confirmPassword =
    document.getElementById("confirmPassword").value;




    if(newPassword !== confirmPassword){


        alert(
            "Passwords do not match"
        );


        return;


    }





    try{


        const response=await fetch(

            "http://localhost:3000/change-password",

            {


                method:"PUT",


                headers:{


                    "Content-Type":"application/json"

                },


                body:JSON.stringify({

                    email:member.email,

                    currentPassword,

                    newPassword

                })


            }

        );




        const result=
        await response.json();




        alert(result.message);




        if(response.ok){


            passwordModal.style.display="none";


            document
            .getElementById("changePasswordForm")
            .reset();


        }



    }


    catch(error){


        console.log(error);


        alert(
            "Server connection failed"
        );


    }



});