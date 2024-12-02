from flask import Flask, request, render_template
from flask_socketio import SocketIO, emit

from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
from presidio_anonymizer import AnonymizerEngine
import requests, json

app = Flask(__name__)

socketio = SocketIO(app)

# Presidio Setup
registry = RecognizerRegistry()
registry.load_predefined_recognizers()

analyzer = AnalyzerEngine(registry=registry)
anonymizer = AnonymizerEngine()


ollama_endpoint = "OLLAMA_URL:11434/api/chat"

#Define JSON data to send in POST request to Ollama API
chat_data = {
    "model":"OLLAMA_MODEL_NAME",
    "messages":[],
    "stream":False
}

""" Get user input in textarea """
""" Parse user input in realtime to check for sensitive information """
@socketio.on('input-data')
def handle_json(json):
    
    data = json['text']
    
    analyzed_data = analyzer.analyze(text=data, language='en')
    
    anonymized_result = anonymizer.anonymize(
        text=data,
        analyzer_results=analyzed_data,
        
    )
    
    anon_result = anonymized_result.text
    
    emit('anon-data', anon_result, broadcast=True)

""" Clears chat history user has started with Ollama """
@socketio.on('clear-chat')
def handle_clear(json):
    if len(chat_data['messages']) > 0:
        chat_data['messages'].clear()



@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        
        data = request.get_json()

        
        # Add user's question to array of user message in POST body
        chat_data['messages'].append({"role":"user","content":data['text']})
        
        ollama_resp = requests.post(url=ollama_endpoint, json=chat_data)
        
        ollama_content = ollama_resp.content.decode("utf8")
        ollama_json = json.loads(ollama_content)
        
        #Add models response to array of POST body so there is context and chat history
        chat_data['messages'].append({"role":"assistant", "content":ollama_json['message']['content']})
        
        #Send Ollama response to front end for user to see
        socketio.emit("ollama-response", ollama_json['message']['content'])
                 
                
    return render_template("index.html")
    

if __name__ == "__main__":
    socketio.run(app, debug=True)
