/**
 * React Query Hooks pro FHIR data
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  fetchPatientsFromBackend,
  searchPatients,
  generatePatients,
  syncPatientsFromFHIR,
  fetchPractitionersFromBackend,
  searchPractitioners,
  fetchLocationsFromBackend,
  syncAllRoomsToFHIR,
  searchProcedures,
  syncOperationToFHIR,
  searchDevices,
  getFHIRServerMetadata,
  checkFHIRServerStatus
} from '../fhirClient';

/**
 * Hook pro načtení pacientů z backendu (Django cache)
 */
export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatientsFromBackend,
    staleTime: 30000, // 30 sekund
  });
}

/**
 * Hook pro vyhledání pacientů v FHIR serveru
 */
export function useSearchPatients(params) {
  return useQuery({
    queryKey: ['patients', 'search', params],
    queryFn: () => searchPatients(params),
    enabled: !!params, // Pouze pokud jsou parametry
  });
}

/**
 * Hook pro generování nových pacientů
 */
export function useGeneratePatients() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (count) => generatePatients(count),
    onSuccess: (data) => {
      // Invalidovat cache pacientů
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success(data.message || 'Pacienti vygenerováni úspěšně');
    },
    onError: (error) => {
      toast.error('Chyba při generování pacientů: ' + error.message);
    }
  });
}

/**
 * Hook pro synchronizaci pacientů z FHIR do Django
 */
export function useSyncPatientsFromFHIR() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: syncPatientsFromFHIR,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success(data.message || 'Pacienti synchronizováni úspěšně');
    },
    onError: (error) => {
      toast.error('Chyba při synchronizaci pacientů: ' + error.message);
    }
  });
}

/**
 * Hook pro načtení praktikujících (doktorů) z backendu
 */
export function usePractitioners() {
  return useQuery({
    queryKey: ['practitioners'],
    queryFn: fetchPractitionersFromBackend,
    staleTime: 60000, // 1 minuta
  });
}

/**
 * Hook pro vyhledání praktikujících v FHIR serveru
 */
export function useSearchPractitioners(params) {
  return useQuery({
    queryKey: ['practitioners', 'search', params],
    queryFn: () => searchPractitioners(params),
    enabled: !!params,
  });
}

/**
 * Hook pro načtení lokací (operačních sálů) z backendu
 */
export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocationsFromBackend,
    staleTime: 60000, // 1 minuta
  });
}

/**
 * Hook pro synchronizaci všech sálů do FHIR
 */
export function useSyncRoomsToFHIR() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: syncAllRoomsToFHIR,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success(data.message || 'Sály synchronizovány úspěšně');
    },
    onError: (error) => {
      toast.error('Chyba při synchronizaci sálů: ' + error.message);
    }
  });
}

/**
 * Hook pro vyhledání procedur (operací) v FHIR serveru
 */
export function useSearchProcedures(params) {
  return useQuery({
    queryKey: ['procedures', 'search', params],
    queryFn: () => searchProcedures(params),
    enabled: !!params,
  });
}

/**
 * Hook pro synchronizaci konkrétní operace do FHIR
 */
export function useSyncOperationToFHIR() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (operationId) => syncOperationToFHIR(operationId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      toast.success(data.message || 'Operace synchronizována úspěšně');
    },
    onError: (error) => {
      toast.error('Chyba při synchronizaci operace: ' + error.message);
    }
  });
}

/**
 * Hook pro vyhledání zařízení v FHIR serveru
 */
export function useSearchDevices(params) {
  return useQuery({
    queryKey: ['devices', 'search', params],
    queryFn: () => searchDevices(params),
    enabled: !!params,
  });
}

/**
 * Hook pro získání metadata FHIR serveru
 */
export function useFHIRMetadata() {
  return useQuery({
    queryKey: ['fhir', 'metadata'],
    queryFn: getFHIRServerMetadata,
    staleTime: 300000, // 5 minut
  });
}

/**
 * Hook pro kontrolu stavu FHIR serveru
 */
export function useFHIRServerStatus() {
  return useQuery({
    queryKey: ['fhir', 'status'],
    queryFn: checkFHIRServerStatus,
    refetchInterval: 60000, // Refresh každou minutu
    retry: 1, // Pouze jeden retry
  });
}

