import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import joblib
import os

def train_model():
    # Mock data for example purposes
    data = {
        'avg_tech_score': [85.0, 40.0, 70.0, 90.0, 55.0],
        'avg_coverage': [80.0, 30.0, 65.0, 95.0, 45.0],
        'filler_rate': [2.1, 8.5, 4.0, 1.0, 6.2],
        'overall_score': [85.0, 35.0, 68.0, 92.0, 50.0] # Target variable
    }
    df = pd.DataFrame(data)
    
    X = df[['avg_tech_score', 'avg_coverage', 'filler_rate']]
    y = df['overall_score']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    predictions = model.predict(X_test)
    print(f"MSE: {mean_squared_error(y_test, predictions)}")
    
    # Save the model for FastAPI to load
    os.makedirs('../backend/app/models_ml', exist_ok=True)
    joblib.dump(model, '../backend/app/models_ml/performance_model.pkl')
    print("Model saved to backend/app/models_ml/performance_model.pkl")

if __name__ == "__main__":
    train_model()
