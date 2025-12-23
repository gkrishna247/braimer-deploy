import unittest
import io
from app import app

class TestApp(unittest.TestCase):
    def setUp(self):
        app.testing = True
        self.client = app.test_client()

    def test_index_route(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_login_route(self):
        response = self.client.post('/login', json={
            'email': 'test@example.com',
            'password': 'password'
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('session_token', response.get_json())

    def test_login_invalid_credentials(self):
        response = self.client.post('/login', json={
            'email': 'test@example.com',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 401)

    def test_analyze_no_file(self):
        response = self.client.post('/analyze')
        # Expect 400 because no file part
        self.assertEqual(response.status_code, 400)

    def test_analyze_invalid_file_type(self):
        data = {
            'image': (io.BytesIO(b"dummy"), 'test.txt')
        }
        response = self.client.post('/analyze', data=data, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid file type', response.get_json()['error'])

if __name__ == '__main__':
    unittest.main()
