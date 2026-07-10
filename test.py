import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv('backend/.env')
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

models = ['gemini-2.0-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest']
for m in models:
    try:
        print(f'Testing {m}...')
        res = genai.GenerativeModel(m).generate_content('Hi')
        print(f'{m} works!')
    except Exception as e:
        print(f'{m} failed: {e}')
