/*


upon arriving to this page, we will request details for the app. 

GET /latest/app/{appId}

which will return a json object with the app details. 

if app type = ModelBuilderApp, we will load the model builder app. 
-- We will load the component ModelBuilderApp.tsx and use the settings from AppID to initialize it. 
-- for now, let's just use default settings (e.g. don't get the data from the API)

{
    "appName": "itrg-bra-builder",
    "appType": "ModelBuilderApp",
    "username": "itrg",
    "password": "itrg"
    "appSettings": {
        "objectModel": "itrg-bra",
        "source": "markdown",
        "target": "dot",
        "title": "Info-Tech Research Group - Business Reference Architecture Builder"
        "description": "This app allows you to build a business reference architecture for Info-Tech Research Group using markdown and dot notation."   
        "layout": {window layout settings
    }
}


if app type = PromptTesterApp, we will load the prompt tester app. 
-- We will load the component PromptTesterApp.tsx and use the settings from AppID to initialize it. 

{
    "appName": "general-prompt-tester",
    "appType": "PromptTesterApp",
    "username": "demo",
    "password": "demo",
    "appSettings": {
        "title": "Demonstration App - Prompt Tester"
        "description": "This app allows you to test prompts with different LLM providers."   
        "layout": {window layout settings
    }
}


requirements:
- the app will start by showing a username and password box, which will accept the username and password settings provided by the app settings. 
- this will be isolated from the rest of the app and won't show the navbar.


*/