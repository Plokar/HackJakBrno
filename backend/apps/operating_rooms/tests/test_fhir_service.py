"""
Tests pro FHIR Service
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from services.fhir_service import FHIRService


@pytest.mark.django_db
class TestFHIRService:
    """Test suite pro FHIRService"""
    
    def setup_method(self):
        """Setup před každým testem"""
        self.fhir_service = FHIRService()
    
    @patch('services.fhir_service.requests.request')
    def test_test_connection_success(self, mock_request):
        """Test úspěšného připojení k FHIR serveru"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'resourceType': 'CapabilityStatement',
            'fhirVersion': '4.0.1'
        }
        mock_response.content = True
        mock_request.return_value = mock_response
        
        result = self.fhir_service.test_connection()
        
        assert result is True
        mock_request.assert_called_once()
    
    @patch('services.fhir_service.requests.request')
    def test_test_connection_failure(self, mock_request):
        """Test neúspěšného připojení"""
        mock_request.side_effect = Exception("Connection failed")
        
        result = self.fhir_service.test_connection()
        
        assert result is False
    
    @patch('services.fhir_service.requests.request')
    def test_get_patient(self, mock_request):
        """Test načtení pacienta"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'resourceType': 'Patient',
            'id': '123',
            'name': [{'family': 'Test', 'given': ['Patient']}]
        }
        mock_response.content = True
        mock_request.return_value = mock_response
        
        result = self.fhir_service.get_patient('123')
        
        assert result is not None
        assert result['resourceType'] == 'Patient'
        assert result['id'] == '123'
    
    @patch('services.fhir_service.requests.request')
    def test_create_patient(self, mock_request):
        """Test vytvoření pacienta"""
        patient_data = {
            'resourceType': 'Patient',
            'name': [{'family': 'Novák', 'given': ['Jan']}]
        }
        
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            **patient_data,
            'id': 'new-patient-id'
        }
        mock_response.content = True
        mock_request.return_value = mock_response
        
        result = self.fhir_service.create_patient(patient_data)
        
        assert result is not None
        assert 'id' in result
        assert result['id'] == 'new-patient-id'
    
    @patch('services.fhir_service.requests.request')
    def test_search_patients(self, mock_request):
        """Test vyhledání pacientů"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'resourceType': 'Bundle',
            'total': 2,
            'entry': [
                {'resource': {'resourceType': 'Patient', 'id': '1'}},
                {'resource': {'resourceType': 'Patient', 'id': '2'}}
            ]
        }
        mock_response.content = True
        mock_request.return_value = mock_response
        
        result = self.fhir_service.search_patients({'gender': 'male'})
        
        assert result is not None
        assert result['resourceType'] == 'Bundle'
        assert result['total'] == 2
        assert len(result['entry']) == 2

