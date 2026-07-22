// =============================
// FCC SETTINGS (CORRECTED)
// =============================


// GET LOGGED USER
let member = JSON.parse(localStorage.getItem("fcc_user"));


// If no user exists
if (!member) {

    member = {
        firstName: "Guest",
        lastName: "Member",
        email: "guest@fccportal.com",
        programOfStudy: "",
        yearOfStudy: ""
    };

    localStorage.setItem(
        "fcc_user",
        JSON.stringify(member)
    );
}



// =============================
// LOAD MEMBER DETAILS
// =============================

window.addEventListener("DOMContentLoaded",()=>{


    const firstName =
    document.getElementById("settingsFirstName");


    const lastName =
    document.getElementById("settingsLastName");



    if(firstName)
        firstName.value = member.firstName || "";



    if(lastName)
        lastName.value = member.lastName || "";



    loadAppearanceSettings();


    loadNotificationSettings();


});




// =============================
// PROFILE UPDATE
// =============================


const profileForm =
document.getElementById("profileSettingsForm");


if(profileForm){


profileForm.addEventListener("submit",async(e)=>{


e.preventDefault();



const data={


firstName:
document.getElementById("settingsFirstName").value,


lastName:
document.getElementById("settingsLastName").value,


programOfStudy:
member.programOfStudy || "",


yearOfStudy:
member.yearOfStudy || "",


email:
member.email


};




try{


const response = await fetch("/update-profile",{


method:"PUT",


headers:{
"Content-Type":"application/json"
},


body:JSON.stringify(data)


});



const result = await response.json();




if(response.ok){


member.firstName=data.firstName;

member.lastName=data.lastName;


localStorage.setItem(
"fcc_user",
JSON.stringify(member)
);



showNotification(
"✅ Profile updated successfully",
"success"
);


}

else{


showNotification(
result.message || "Update failed",
"danger"
);


}



}

catch(error){


console.error(error);


showNotification(
"Server connection failed",
"danger"
);



}



});


}






// =============================
// PASSWORD VISIBILITY
// =============================


document.querySelectorAll(".togglePassword")
.forEach(icon=>{


icon.addEventListener("click",()=>{


const input =
icon.previousElementSibling;



if(input.type==="password"){


input.type="text";


icon.classList.remove("fa-eye");


icon.classList.add("fa-eye-slash");


}

else{


input.type="password";


icon.classList.remove("fa-eye-slash");


icon.classList.add("fa-eye");


}



});


});






// =============================
// CHANGE PASSWORD
// =============================


const securityForm =
document.getElementById("securityForm");



const newPassword =
document.getElementById("newPassword");


const confirmPassword =
document.getElementById("confirmPassword");


const passwordMessage =
document.getElementById("passwordMessage");




if(confirmPassword){


confirmPassword.addEventListener("keyup",()=>{


if(confirmPassword.value===""){

passwordMessage.innerHTML="";

return;

}



if(newPassword.value===confirmPassword.value){


passwordMessage.innerHTML=
"✔ Passwords match";


passwordMessage.style.color="green";


}

else{


passwordMessage.innerHTML=
"✖ Passwords do not match";


passwordMessage.style.color="red";


}



});


}




if(securityForm){



securityForm.addEventListener("submit",async(e)=>{


e.preventDefault();



if(newPassword.value!==confirmPassword.value){


showNotification(
"Passwords do not match",
"warning"
);


return;


}




try{


const response =
await fetch("/change-password",{


method:"PUT",


headers:{


"Content-Type":"application/json"


},


body:JSON.stringify({


email:member.email,


currentPassword:
document.getElementById("currentPassword").value,


newPassword:
newPassword.value



})


});



const result =
await response.json();




if(response.ok){


showNotification(
"🔒 Password changed successfully",
"success"
);


securityForm.reset();


passwordMessage.innerHTML="";


}


else{


showNotification(
result.message || "Password change failed",
"danger"
);



}



}

catch(error){


console.error(error);


showNotification(
"Server error",
"danger"
);



}




});



}






// =============================
// DARK MODE
// =============================


const darkMode =
document.getElementById("darkMode");



if(localStorage.getItem("darkMode")==="true"){


document.body.classList.add("dark");


if(darkMode)
darkMode.checked=true;


}



if(darkMode){


darkMode.addEventListener("change",()=>{


document.body.classList.toggle(
"dark"
);



localStorage.setItem(
"darkMode",
darkMode.checked
);



});

}




// =============================
// FONT SIZE
// =============================


const fontSize =
document.getElementById("fontSize");



function loadAppearanceSettings(){


if(fontSize){


const saved =
localStorage.getItem("fontSize");


if(saved){


fontSize.value=saved;


document.body.classList.add(saved);


}


}




const theme =
document.getElementById("themeColor");


if(theme){


theme.value =
localStorage.getItem("themeColor") || "blue";


document.body.dataset.theme =
theme.value;


}



const background =
document.getElementById("backgroundType");


if(background){


background.value =
localStorage.getItem("background") || "logo";


document.body.dataset.background =
background.value;


}



}



if(fontSize){


fontSize.addEventListener("change",()=>{


document.body.classList.remove(
"small",
"medium",
"large"
);


document.body.classList.add(
fontSize.value
);



localStorage.setItem(
"fontSize",
fontSize.value
);



});


}






// =============================
// THEME
// =============================


document.getElementById("themeColor")
?.addEventListener("change",(e)=>{


document.body.dataset.theme =
e.target.value;


localStorage.setItem(
"themeColor",
e.target.value
);



});





// =============================
// BACKGROUND
// =============================


document.getElementById("backgroundType")
?.addEventListener("change",(e)=>{


document.body.dataset.background =
e.target.value;


localStorage.setItem(
"background",
e.target.value
);



});







// =============================
// SAVE NOTIFICATIONS
// =============================


document.getElementById("saveNotificationsBtn")
?.addEventListener("click",()=>{


const settings={


announcements:
document.getElementById("notifyAnnouncements").checked,


events:
document.getElementById("notifyEvents").checked,


prayer:
document.getElementById("notifyPrayer").checked,


verse:
document.getElementById("notifyVerse").checked,


fellowship:
document.getElementById("notifyFellowship").checked



};



localStorage.setItem(
"notifications",
JSON.stringify(settings)
);



showNotification(
"✅ Notification preferences saved",
"success"
);



});







function loadNotificationSettings(){


const saved =
JSON.parse(
localStorage.getItem("notifications")
);



if(!saved)return;



document.getElementById("notifyAnnouncements").checked =
saved.announcements;


document.getElementById("notifyEvents").checked =
saved.events;


document.getElementById("notifyPrayer").checked =
saved.prayer;


document.getElementById("notifyVerse").checked =
saved.verse;


document.getElementById("notifyFellowship").checked =
saved.fellowship;



}







// =============================
// LOGOUT
// =============================


function logout(){


localStorage.removeItem("fcc_user");


window.location.href="login.html";


}



document.getElementById("logoutBtn")
?.addEventListener("click",logout);



document.getElementById("logoutEverywhere")
?.addEventListener("click",logout);






// =============================
// NOTIFICATION
// =============================


function showNotification(message,type="success"){


const notification =
document.getElementById("notification");



if(!notification)return;



notification.innerHTML=message;


notification.className =
"notification show " + type;



setTimeout(()=>{


notification.className="notification";


},3000);



}

// =============================
// SAVE APPEARANCE SETTINGS
// =============================

const saveAppearanceBtn = document.getElementById("saveAppearance");


if(saveAppearanceBtn){

    saveAppearanceBtn.addEventListener("click",()=>{


        const appearance = {

            darkMode:
            document.getElementById("darkMode").checked,


            fontSize:
            document.getElementById("fontSize").value,


            themeColor:
            document.getElementById("themeColor").value,


            background:
            document.getElementById("backgroundType").value

        };



        // Save permanently in browser

        localStorage.setItem(
            "appearance",
            JSON.stringify(appearance)
        );



        showNotification(
            "🎨 Appearance settings saved successfully",
            "success"
        );


    });

}






// =============================
// LOAD SAVED APPEARANCE
// =============================


function loadSavedAppearance(){


    const saved =
    JSON.parse(
        localStorage.getItem("appearance")
    );



    if(!saved) return;



    const dark =
    document.getElementById("darkMode");


    const font =
    document.getElementById("fontSize");


    const theme =
    document.getElementById("themeColor");


    const background =
    document.getElementById("backgroundType");





    if(dark){

        dark.checked =
        saved.darkMode;


        document.body.classList.toggle(
            "dark",
            saved.darkMode
        );

    }




    if(font){

        font.value =
        saved.fontSize;


        document.body.classList.add(
            saved.fontSize
        );

    }





    if(theme){

        theme.value =
        saved.themeColor;


        document.body.dataset.theme =
        saved.themeColor;

    }






    if(background){

        background.value =
        saved.background;


        document.body.dataset.background =
        saved.background;

    }



}





// Load when page opens

window.addEventListener(
"DOMContentLoaded",
()=>{

    loadSavedAppearance();

});