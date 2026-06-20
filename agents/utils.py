import os
import logging
import requests
import google.generativeai as genai

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

# Initialize Gemini SDK if API key is present
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Gemini SDK configured successfully.")
    except Exception as e:
        logger.error(f"Error configuring Gemini SDK: {e}")
        GEMINI_API_KEY = None

if NVIDIA_API_KEY:
    logger.info("Nvidia NIM API Key detected. Using Nvidia LLM gateway.")

async def call_gemini(system_prompt: str, user_prompt: str, history: list = None) -> str:
    """Safely dispatches LLM requests. Prioritizes Nvidia NIM, then Gemini API, then fallback simulation."""
    if NVIDIA_API_KEY:
        try:
            return await call_nvidia_nim(system_prompt, user_prompt, history)
        except Exception as e:
            logger.error(f"Nvidia NIM API call failed: {e}. Falling back to other channels.")
            
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=system_prompt
            )
            contents = []
            if history:
                for msg in history:
                    role = "user" if msg.get("role") == "user" else "model"
                    contents.append({"role": role, "parts": [msg.get("content")]})
            
            contents.append({"role": "user", "parts": [user_prompt]})
            
            import asyncio
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: model.generate_content(contents)
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}. Falling back to simulation.")
            
    return simulate_response(system_prompt, user_prompt)

async def call_nvidia_nim(system_prompt: str, user_prompt: str, history: list = None) -> str:
    """Calls Nvidia NIM OpenAI-compatible endpoint with the provided Nvidia API key."""
    url = "https://integrate.api.nvidia.com/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Formulate messages in OpenAI chat schema
    messages = [
        {"role": "system", "content": system_prompt}
    ]
    
    # Trim history to last 6 turns (3 user + 3 assistant) to reduce token overhead
    if history:
        recent = history[-6:]
        for msg in recent:
            role = "user" if msg.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": msg.get("content", "")})
            
    messages.append({"role": "user", "content": user_prompt})
    
    payload = {
        "model": "meta/llama-3.1-8b-instruct",  # Faster model (~2-3s vs ~9s for 70B)
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 512,   # Reduced from 1024 for quicker first-token latency
        "top_p": 1.0
    }
    
    import asyncio
    loop = asyncio.get_event_loop()
    
    # Dispatch sync request in uvicorn thread pool
    response = await loop.run_in_executor(
        None,
        lambda: requests.post(url, headers=headers, json=payload, timeout=30)
    )
    
    if response.status_code == 200:
        res_json = response.json()
        return res_json["choices"][0]["message"]["content"]
    else:
        raise ValueError(f"Nvidia NIM returned status code {response.status_code}: {response.text}")

def simulate_response(system_prompt: str, user_prompt: str) -> str:
    """A rule-based mock response generator to make the app fully functional without an API key."""
    prompt_lower = user_prompt.lower()
    
    if "Health Advisor" in system_prompt:
        if "diabetes" in prompt_lower:
            return (
                "**[Simulated Health Advisor]**\n\n"
                "Diabetes is a chronic condition that affects how your body turns food into energy. "
                "Type 1 is an autoimmune reaction, while Type 2 occurs when your body becomes resistant to insulin.\n\n"
                "**Please note:** This is general information and not a medical diagnosis. "
                "It is critical that you consult a healthcare professional for diagnosis, personalized treatment, and dosage advice."
            )
        elif "headache" in prompt_lower or "pain" in prompt_lower:
            return (
                "**[Simulated Health Advisor]**\n\n"
                "Headaches can be caused by dehydration, stress, lack of sleep, eye strain, or sinus pressure. "
                "Staying hydrated and resting in a quiet, dark room can often help.\n\n"
                "**Please note:** If you experience sudden, severe headaches, or if they are accompanied by fever or stiff neck, "
                "seek medical attention. Consult a doctor for proper diagnosis."
            )
        else:
            return (
                "**[Simulated Health Advisor]**\n\n"
                "Thank you for your question. I can explain general health terms, symptoms, and medication actions, "
                "but I cannot provide diagnoses or specific prescriptions. For your safety, please check with a medical professional."
            )
            
    elif "Reminder Agent" in system_prompt:
        return (
            "**[Simulated Reminder Agent]**\n\n"
            "I've processed your request to schedule a reminder. I will attempt to add this to your schedule.\n"
            "Action Details: Create reminder for event. Status: Successfully processed."
        )
        
    elif "Knowledge" in system_prompt:
        return (
            "**[Simulated Knowledge Agent]**\n\n"
            "According to the **World Health Organization (WHO)** and **CDC** guidance:\n"
            "- Standard clinical guidelines recommend consistent daily medication adherence to prevent disease progression.\n"
            "- Always keep a list of your active medications and share them with your physician during visits.\n\n"
            "*References: WHO Adherence Guidelines (2003), CDC Patient Fact Sheets.*"
        )
        
    elif "Emergency" in system_prompt:
        return (
            "**[Simulated Emergency Escalation Agent]**\n\n"
            "🚨 **URGENT MEDICAL WARNING** 🚨\n"
            "Your message contains emergency indicators. Please stop reading and seek immediate medical help:\n"
            "- Call emergency services (911 / your local emergency line) immediately.\n"
            "- Go to the nearest Emergency Room.\n\n"
            "**Do not wait** for further response. Your safety is our absolute priority."
        )
        
    return f"**[Simulated Response]**\nReceived: '{user_prompt}'\nProcessed under guidelines."
