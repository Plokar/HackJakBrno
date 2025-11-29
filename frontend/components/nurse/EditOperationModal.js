import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';
import PersonnelTab from './PersonnelTab';
import ToolsTab from './ToolsTab';
import MaterialsTab from './MaterialsTab';
import EquipmentTab from './EquipmentTab';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`operation-tabpanel-${index}`}
      aria-labelledby={`operation-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function EditOperationModal({ open, onClose, operation, onUpdate }) {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [costSummary, setCostSummary] = useState(null);
  
  const [operationData, setOperationData] = useState(null);

  useEffect(() => {
    if (open && operation) {
      setOperationData(operation);
      loadCostSummary();
    }
  }, [open, operation]);

  const loadCostSummary = async () => {
    if (!operation) return;
    
    try {
      const response = await fetch(`/api/proxy/medic/nurse/operations/${operation.id}/cost-summary`);
      if (response.ok) {
        const data = await response.json();
        setCostSummary(data);
      }
    } catch (err) {
      console.error('Chyba pri nacitani nakladu:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePersonnelUpdate = async (personnelData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/proxy/medic/nurse/operations/${operation.id}/add-personnel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(personnelData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba pri pridavani personalu');
      }

      const data = await response.json();
      setSuccess('Personal byl uspesne pridan');
      loadCostSummary();
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToolAdd = async (toolData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/proxy/medic/nurse/operations/${operation.id}/add-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toolData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba pri pridavani nastroje');
      }

      const data = await response.json();
      setSuccess(data.message);
      loadCostSummary();
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialAdd = async (materialData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/proxy/medic/nurse/operations/${operation.id}/add-material`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(materialData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba pri pridavani materialu');
      }

      const data = await response.json();
      setSuccess(data.message);
      loadCostSummary();
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentAdd = async (equipmentData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/proxy/medic/nurse/operations/${operation.id}/add-equipment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(equipmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba pri pridavani pristroje');
      }

      const data = await response.json();
      setSuccess(data.message);
      loadCostSummary();
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveTab(0);
    setError(null);
    setSuccess(null);
    setCostSummary(null);
    onClose();
  };

  if (!operation) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Editace operace - {operation.operation_type}
          </Typography>
          <Box display="flex" gap={1}>
            <Chip 
              label={operation.status_display} 
              color="primary" 
              size="small"
            />
            {costSummary && (
              <Chip 
                label={`Celkové náklady: ${costSummary.total_cost.toLocaleString('cs-CZ')} Kč`}
                color="secondary"
                size="small"
              />
            )}
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Pacient: {operation.patient?.first_name} {operation.patient?.last_name}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Personál" />
            <Tab label="Nástroje" />
            <Tab label="Materiály" />
            <Tab label="Přístroje" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <PersonnelTab
            operation={operation}
            onUpdate={handlePersonnelUpdate}
            loading={loading}
            costSummary={costSummary}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <ToolsTab
            operation={operation}
            onAdd={handleToolAdd}
            onRefresh={loadCostSummary}
            loading={loading}
            costSummary={costSummary}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <MaterialsTab
            operation={operation}
            onAdd={handleMaterialAdd}
            onRefresh={loadCostSummary}
            loading={loading}
            costSummary={costSummary}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <EquipmentTab
            operation={operation}
            onAdd={handleEquipmentAdd}
            onRefresh={loadCostSummary}
            loading={loading}
            costSummary={costSummary}
          />
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Zavřít
        </Button>
        <Button 
          variant="contained" 
          onClick={() => {
            if (onUpdate) onUpdate();
            handleClose();
          }}
        >
          Hotovo
        </Button>
      </DialogActions>
    </Dialog>
  );
}
