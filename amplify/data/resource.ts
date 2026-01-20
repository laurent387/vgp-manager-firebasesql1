import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  User: a
    .model({
      email: a.string().required(),
      password: a.string().required(),
      role: a.enum(['admin', 'controleur', 'client']),
      clientId: a.id(),
      client: a.belongsTo('Client', 'clientId'),
      nom: a.string(),
      prenom: a.string(),
      qualifications: a.json(),
      resetToken: a.string(),
      resetTokenExpiry: a.string(),
      activationToken: a.string(),
      activationTokenExpiry: a.string(),
      isActivated: a.boolean(),
      isActive: a.boolean(),
      vgpHistory: a.hasMany('VGPHistory', 'technicienId'),
      scheduledEvents: a.hasMany('ScheduledEvent', 'controllerId'),
      tickets: a.hasMany('Ticket', 'assignedTo'),
      interventionsAsTechnician: a.hasMany('Intervention', 'technicianId'),
    })
    .authorization((allow) => [allow.owner(), allow.group('admin')]),

  Client: a
    .model({
      nom: a.string().required(),
      adresse: a.string().required(),
      contactNom: a.string(),
      contactPrenom: a.string(),
      contactEmail: a.string(),
      contactTelephone: a.string(),
      machines: a.hasMany('Machine', 'clientId'),
      scheduledEvents: a.hasMany('ScheduledEvent', 'clientId'),
      interventions: a.hasMany('Intervention', 'clientId'),
      tickets: a.hasMany('Ticket', 'clientId'),
      reports: a.hasMany('Report', 'clientId'),
      users: a.hasMany('User', 'clientId'),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),

  Machine: a
    .model({
      clientId: a.id().required(),
      client: a.belongsTo('Client', 'clientId'),
      dateMiseEnService: a.string(),
      numeroSerie: a.string(),
      constructeur: a.string(),
      modele: a.string(),
      typeMachine: a.enum(['mobile', 'fixe', 'presse_plieuse']),
      dateDerniereVGP: a.string(),
      prochaineVGP: a.string(),
      periodicite: a.integer(),
      observations: a.string(),
      customFields: a.json(),
      referenceClient: a.string(),
      force: a.string(),
      compteurHoraire: a.string(),
      categoriePdf: a.string(),
      anneeMiseEnService: a.integer(),
      vgpHistory: a.hasMany('VGPHistory', 'machineId'),
      scheduledEvents: a.hasMany('ScheduledEvent', 'machineId'),
      interventions: a.hasMany('Intervention', 'machineId'),
      tickets: a.hasMany('Ticket', 'machineId'),
      reportInspections: a.hasMany('ReportInspection', 'machineId'),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),

  CustomFieldTemplate: a
    .model({
      key: a.string().required(),
      name: a.string(),
      label: a.string().required(),
      type: a.enum(['text', 'number', 'date', 'photo', 'pdf']),
      required: a.boolean(),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),

  CheckpointTemplate: a
    .model({
      name: a.string(),
      label: a.string().required(),
      category: a.string(),
      description: a.string(),
      ordre: a.integer().required(),
      orderIndex: a.integer(),
      actif: a.boolean().required(),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),

  VGPHistory: a
    .model({
      machineId: a.id().required(),
      machine: a.belongsTo('Machine', 'machineId'),
      dateControl: a.string().required(),
      controllerId: a.id(),
      technicienId: a.id(),
      technicien: a.belongsTo('User', 'technicienId'),
      technicienEmail: a.string().required(),
      status: a.string(),
      checklist: a.json(),
      checkpoints: a.json(),
      observations: a.string().required(),
      photos: a.json(),
      conforme: a.boolean().required(),
      protectionDevices: a.json(),
      particularites: a.json(),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),

  ScheduledEvent: a
    .model({
      type: a.enum(['vgp_deadline', 'scheduled_control']),
      clientId: a.id().required(),
      client: a.belongsTo('Client', 'clientId'),
      machineId: a.id(),
      machine: a.belongsTo('Machine', 'machineId'),
      controllerId: a.id(),
      controller: a.belongsTo('User', 'controllerId'),
      scheduledDate: a.string().required(),
      title: a.string().required(),
      description: a.string(),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),

  Part: a
    .model({
      reference: a.string().required(),
      name: a.string().required(),
      description: a.string(),
      category: a.string(),
      stockQuantity: a.integer().required(),
      minStockLevel: a.integer().required(),
      unitPrice: a.float().required(),
      supplier: a.string(),
      location: a.string(),
      interventionParts: a.hasMany('InterventionPart', 'partId'),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),

  InterventionPart: a
    .model({
      interventionId: a.id().required(),
      intervention: a.belongsTo('Intervention', 'interventionId'),
      partId: a.id().required(),
      part: a.belongsTo('Part', 'partId'),
      quantity: a.integer().required(),
      unitPrice: a.float().required(),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),

  Intervention: a
    .model({
      machineId: a.id().required(),
      machine: a.belongsTo('Machine', 'machineId'),
      clientId: a.id().required(),
      client: a.belongsTo('Client', 'clientId'),
      type: a.enum(['preventive', 'corrective', 'ameliorative']),
      status: a.enum(['planned', 'in_progress', 'completed', 'cancelled']),
      priority: a.enum(['low', 'medium', 'high', 'urgent']),
      title: a.string().required(),
      description: a.string().required(),
      technicianId: a.id(),
      technician: a.belongsTo('User', 'technicianId'),
      scheduledDate: a.string(),
      startDate: a.string(),
      endDate: a.string(),
      durationMinutes: a.integer(),
      parts: a.hasMany('InterventionPart', 'interventionId'),
      workDone: a.string(),
      observations: a.string(),
      cost: a.float(),
      ticket: a.hasOne('Ticket', 'interventionId'),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),

  Ticket: a
    .model({
      machineId: a.id().required(),
      machine: a.belongsTo('Machine', 'machineId'),
      clientId: a.id().required(),
      client: a.belongsTo('Client', 'clientId'),
      reportedBy: a.string().required(),
      title: a.string().required(),
      description: a.string().required(),
      priority: a.enum(['low', 'medium', 'high', 'urgent']),
      status: a.enum(['open', 'assigned', 'resolved', 'closed']),
      assignedTo: a.id(),
      assignee: a.belongsTo('User', 'assignedTo'),
      interventionId: a.id(),
      intervention: a.belongsTo('Intervention', 'interventionId'),
      resolvedAt: a.string(),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),

  Report: a
    .model({
      report_number: a.string().required(),
      clientId: a.id().required(),
      client: a.belongsTo('Client', 'clientId'),
      organisme: a.string(),
      client_reference: a.string(),
      categorie: a.string(),
      date_verification: a.string(),
      date_rapport: a.string(),
      signataire_nom: a.string(),
      has_observations: a.boolean(),
      pieces_jointes: a.string(),
      adresse_facturation_raw: a.string(),
      raw_payload: a.json(),
      inspections: a.hasMany('ReportInspection', 'reportId'),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),

  ReportInspection: a
    .model({
      reportId: a.id().required(),
      report: a.belongsTo('Report', 'reportId'),
      machineId: a.id().required(),
      machine: a.belongsTo('Machine', 'machineId'),
      titre_section: a.string(),
      mission_code: a.string(),
      texte_reference: a.string(),
      resultat_status: a.enum(['OK', 'KO', 'NOT_VERIFIED', 'INFO_ONLY']),
      resultat_comment: a.string(),
      particularites_json: a.json(),
      observations: a.hasMany('ReportObservation', 'inspectionId'),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),

  ReportObservation: a
    .model({
      inspectionId: a.id().required(),
      inspection: a.belongsTo('ReportInspection', 'inspectionId'),
      numero: a.integer(),
      point_de_controle: a.string(),
      observation: a.string(),
      date_1er_constat: a.string(),
      page: a.integer(),
    })
    .authorization((allow) => [allow.authenticated(), allow.group('admin')]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
