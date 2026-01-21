import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useMemo } from 'react';
import { Client, Machine, VGPHistory, CustomFieldTemplate, CheckpointTemplate, StoredUser, ScheduledEvent, Intervention, Part, TicketType, Report, ReportInspection, ReportObservation, ImportLog } from '@/types';
import { trpc } from '@/lib/trpc';
import { useAuth } from './AuthProvider';

export const [DataProvider, useData] = createContextHook(() => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);

  const clientsQuery = trpc.clients.getAll.useQuery(undefined, {
    enabled: !!user,
  });

  const machinesQuery = trpc.machines.getAll.useQuery(undefined, {
    enabled: !!user,
  });

  const usersQuery = trpc.data.getUsers.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  const checkpointTemplatesQuery = trpc.data.getCheckpointTemplates.useQuery(undefined, {
    enabled: !!user,
  });

  const customFieldTemplatesQuery = trpc.data.getCustomFieldTemplates.useQuery(undefined, {
    enabled: !!user,
  });

  const scheduledEventsQuery = trpc.data.getScheduledEvents.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      const allLoaded = !clientsQuery.isLoading && 
                        !machinesQuery.isLoading && 
                        !checkpointTemplatesQuery.isLoading && 
                        !customFieldTemplatesQuery.isLoading;
      
      if (allLoaded) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [
    clientsQuery.isLoading, 
    machinesQuery.isLoading, 
    checkpointTemplatesQuery.isLoading, 
    customFieldTemplatesQuery.isLoading,
    user
  ]);

  const clients = useMemo(() => {
    const data = clientsQuery.data || [];
    if (user?.role === 'client' && user.clientId) {
      return data.filter(c => c.id === user.clientId);
    }
    return data;
  }, [clientsQuery.data, user]);

  const machines = useMemo(() => {
    const data = machinesQuery.data || [];
    if (user?.role === 'client' && user.clientId) {
      return data.filter(m => m.clientId === user.clientId);
    }
    return data;
  }, [machinesQuery.data, user]);

  const users = useMemo(() => {
    return usersQuery.data || [];
  }, [usersQuery.data]);

  const checkpointTemplates = useMemo(() => {
    return checkpointTemplatesQuery.data || [];
  }, [checkpointTemplatesQuery.data]);

  const customFieldTemplates = useMemo(() => {
    return customFieldTemplatesQuery.data || [];
  }, [customFieldTemplatesQuery.data]);

  const scheduledEvents = useMemo(() => {
    return scheduledEventsQuery.data || [];
  }, [scheduledEventsQuery.data]);

  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      clientsQuery.refetch();
    },
  });

  const updateClientMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      clientsQuery.refetch();
    },
  });

  const deleteClientMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      clientsQuery.refetch();
    },
  });

  const createMachineMutation = trpc.machines.create.useMutation({
    onSuccess: () => {
      machinesQuery.refetch();
    },
  });

  const updateMachineMutation = trpc.machines.update.useMutation({
    onSuccess: () => {
      machinesQuery.refetch();
    },
  });

  const deleteMachineMutation = trpc.machines.delete.useMutation({
    onSuccess: () => {
      machinesQuery.refetch();
    },
  });

  const createVGPHistoryMutation = trpc.data.createVGPHistory.useMutation();

  const updateUserMutation = trpc.data.updateUser.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
    },
  });

  const deleteUserMutation = trpc.data.deleteUser.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
    },
  });

  const createCheckpointTemplateMutation = trpc.data.createCheckpointTemplate.useMutation({
    onSuccess: () => {
      checkpointTemplatesQuery.refetch();
    },
  });

  const updateCheckpointTemplateMutation = trpc.data.updateCheckpointTemplate.useMutation({
    onSuccess: () => {
      checkpointTemplatesQuery.refetch();
    },
  });

  const deleteCheckpointTemplateMutation = trpc.data.deleteCheckpointTemplate.useMutation({
    onSuccess: () => {
      checkpointTemplatesQuery.refetch();
    },
  });

  const createCustomFieldTemplateMutation = trpc.data.createCustomFieldTemplate.useMutation({
    onSuccess: () => {
      customFieldTemplatesQuery.refetch();
    },
  });

  const deleteCustomFieldTemplateMutation = trpc.data.deleteCustomFieldTemplate.useMutation({
    onSuccess: () => {
      customFieldTemplatesQuery.refetch();
    },
  });

  const createScheduledEventMutation = trpc.data.createScheduledEvent.useMutation({
    onSuccess: () => {
      scheduledEventsQuery.refetch();
    },
  });

  const updateScheduledEventMutation = trpc.data.updateScheduledEvent.useMutation({
    onSuccess: () => {
      scheduledEventsQuery.refetch();
    },
  });

  const deleteScheduledEventMutation = trpc.data.deleteScheduledEvent.useMutation({
    onSuccess: () => {
      scheduledEventsQuery.refetch();
    },
  });

  const addClient = async (client: Omit<Client, 'id' | 'createdAt'>) => {
    await createClientMutation.mutateAsync(client);
  };

  const updateClient = async (client: Client) => {
    await updateClientMutation.mutateAsync(client);
  };

  const deleteClient = async (id: string) => {
    await deleteClientMutation.mutateAsync({ id });
  };

  const addMachine = async (machine: Omit<Machine, 'id'>) => {
    await createMachineMutation.mutateAsync(machine);
  };

  const updateMachine = async (machine: Machine) => {
    await updateMachineMutation.mutateAsync(machine);
  };

  const deleteMachine = async (id: string) => {
    await deleteMachineMutation.mutateAsync({ id });
  };

  const addVGPHistory = async (history: Omit<VGPHistory, 'id' | 'createdAt'>) => {
    await createVGPHistoryMutation.mutateAsync({
      machineId: history.machineId,
      dateControl: history.dateControl,
      technicienId: history.technicienId,
      resultat: history.resultat || 'conforme',
      observations: history.observations,
      checkpoints: history.checkpoints || [],
      photos: history.photos || [],
      documents: history.documents || [],
    });
  };

  const updateUser = async (userId: string, updates: Partial<StoredUser>) => {
    await updateUserMutation.mutateAsync({ id: userId, ...updates });
  };

  const deleteUser = async (id: string) => {
    await deleteUserMutation.mutateAsync({ id });
  };

  const addCheckpointTemplate = async (template: Omit<CheckpointTemplate, 'id' | 'createdAt' | 'actif'>) => {
    await createCheckpointTemplateMutation.mutateAsync({
      name: template.name,
      label: template.label,
      category: template.category,
      description: template.description,
      ordre: template.ordre,
    });
  };

  const updateCheckpointTemplate = async (template: CheckpointTemplate) => {
    await updateCheckpointTemplateMutation.mutateAsync({
      id: template.id,
      name: template.name,
      label: template.label,
      category: template.category,
      description: template.description,
      ordre: template.ordre,
      actif: template.actif,
    });
  };

  const deleteCheckpointTemplate = async (id: string) => {
    await deleteCheckpointTemplateMutation.mutateAsync({ id });
  };

  const addCustomFieldTemplate = async (template: Omit<CustomFieldTemplate, 'id' | 'createdAt'>) => {
    await createCustomFieldTemplateMutation.mutateAsync(template);
  };

  const deleteCustomFieldTemplate = async (id: string) => {
    await deleteCustomFieldTemplateMutation.mutateAsync({ id });
  };

  const addScheduledEvent = async (event: Omit<ScheduledEvent, 'id' | 'createdAt'>) => {
    await createScheduledEventMutation.mutateAsync({
      title: event.title,
      date: event.date,
      clientId: event.clientId,
      machineIds: event.machineIds,
      technicienId: event.technicienId,
      type: event.type,
      notes: event.notes,
    });
  };

  const updateScheduledEvent = async (event: ScheduledEvent) => {
    await updateScheduledEventMutation.mutateAsync(event);
  };

  const deleteScheduledEvent = async (id: string) => {
    await deleteScheduledEventMutation.mutateAsync({ id });
  };

  const refetchAll = async () => {
    await Promise.all([
      clientsQuery.refetch(),
      machinesQuery.refetch(),
      usersQuery.refetch(),
      checkpointTemplatesQuery.refetch(),
      customFieldTemplatesQuery.refetch(),
      scheduledEventsQuery.refetch(),
    ]);
  };

  const getClient = (id: string) => clients.find(c => c.id === id);
  const getMachinesByClient = (clientId: string) => machines.filter(m => m.clientId === clientId);
  const getUserByEmail = (email: string) => users.find(u => u.email === email);
  const getMachine = (id: string) => machines.find(m => m.id === id);
  const getEventsByController = (controllerId: string) => scheduledEvents.filter(e => e.technicienId === controllerId);
  const getEventsByClient = (clientId: string) => scheduledEvents.filter(e => e.clientId === clientId);
  const getVGPHistoryByMachine = (machineId: string): VGPHistory[] => [];
  const getObservationsByInspection = (inspectionId: string): ReportObservation[] => [];
  const getInspectionsByReport = (reportId: string): ReportInspection[] => [];
  
  const addCustomFieldToMachine = async (machineId: string, field: { key: string; label: string; type: 'text' | 'number' | 'date' | 'photo' | 'pdf'; value?: string }) => {
    const machine = machines.find(m => m.id === machineId);
    if (!machine) throw new Error('Machine not found');
    
    const newField = {
      id: `cf_${Date.now()}`,
      ...field,
    };
    
    const updatedCustomFields = [...(machine.customFields || []), newField];
    await updateMachine({ ...machine, customFields: updatedCustomFields });
  };

  return {
    loading,
    clients,
    machines,
    users,
    checkpointTemplates,
    customFieldTemplates,
    scheduledEvents,
    vgpHistory: [] as VGPHistory[],
    interventions: [] as Intervention[],
    parts: [] as Part[],
    tickets: [] as TicketType[],
    reports: [] as Report[],
    reportInspections: [] as ReportInspection[],
    reportObservations: [] as ReportObservation[],
    getClient,
    getMachinesByClient,
    getMachine,
    getUserByEmail,
    getEventsByController,
    getEventsByClient,
    getVGPHistoryByMachine,
    getObservationsByInspection,
    getInspectionsByReport,
    addCustomFieldToMachine,
    addClient,
    updateClient,
    deleteClient,
    addMachine,
    updateMachine,
    updateMachineFromAdmin: async (id: string, updates: Partial<Machine>) => {
      const machine = machines.find(m => m.id === id);
      if (!machine) throw new Error('Machine not found');
      await updateMachine({ ...machine, ...updates });
    },
    deleteMachine,
    addVGPHistory,
    updateUser,
    deleteUser,
    addUser: async (user: Omit<StoredUser, 'id' | 'createdAt'>) => { throw new Error('Not implemented'); },
    addCheckpointTemplate: async (template: { label: string; ordre: number; actif: boolean }): Promise<CheckpointTemplate> => {
      await createCheckpointTemplateMutation.mutateAsync({
        label: template.label,
        ordre: template.ordre,
      });
      await checkpointTemplatesQuery.refetch();
      return checkpointTemplates[checkpointTemplates.length - 1];
    },
    updateCheckpointTemplate: async (id: string, updates: Partial<CheckpointTemplate>) => {
      const template = checkpointTemplates.find(t => t.id === id);
      if (!template) throw new Error('Template not found');
      await updateCheckpointTemplateMutation.mutateAsync({ ...template, ...updates });
    },
    deleteCheckpointTemplate,
    updateCustomFieldTemplate: async (id: string, updates: Partial<CustomFieldTemplate>) => { throw new Error('Not implemented'); },
    addCustomFieldTemplate: async (template: { key: string; label: string; type: 'text' | 'number' | 'date' | 'photo' | 'pdf' }): Promise<CustomFieldTemplate> => {
      await createCustomFieldTemplateMutation.mutateAsync(template);
      await customFieldTemplatesQuery.refetch();
      return customFieldTemplates[customFieldTemplates.length - 1];
    },
    importReport: async (payload: any, replaceExisting: boolean = false) => {
      console.log('[DataProvider] importReport called, replaceExisting:', replaceExisting);
      return { logs: [] as ImportLog[] };
    },
    deleteCustomFieldTemplate,
    addScheduledEvent,
    updateScheduledEvent,
    deleteScheduledEvent,
    clearAllData: async () => { throw new Error('Not implemented'); },
    deleteSelectedData: async () => { throw new Error('Not implemented'); },
    refetchAll,
  };
});
