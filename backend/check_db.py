from database import test_database_connection

result = test_database_connection()
print("Database connection successful!")
print("SELECT 1 returned:", result)