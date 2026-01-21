import { Client, Machine, VGPHistory } from '@/types';
import { formatDate } from './vgp';
import { Platform, Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { GROUPE_ADF_LOGO } from '@/constants/vgp';

export async function exportClientReportCSV(
  client: Client,
  machines: Machine[],
  vgpHistory: VGPHistory[]
): Promise<void> {
  const headers = [
    'Machine',
    'N° Série',
    'Constructeur',
    'Modèle',
    'Type',
    'Date mise en service',
    'Dernière VGP',
    'Prochaine VGP',
    'Périodicité (mois)',
    'Observations',
  ];

  const rows = machines.map((machine) => [
    `${machine.constructeur} ${machine.modele}`,
    machine.numeroSerie,
    machine.constructeur,
    machine.modele,
    machine.typeMachine === 'mobile' ? 'Mobile' : 'Fixe',
    formatDate(machine.dateMiseEnService),
    machine.dateDerniereVGP ? formatDate(machine.dateDerniereVGP) : 'N/A',
    machine.prochaineVGP ? formatDate(machine.prochaineVGP) : 'N/A',
    machine.periodicite.toString(),
    machine.observations || '',
  ]);

  const csvContent = [
    `Rapport Client - ${client.nom}`,
    `Généré le: ${new Date().toLocaleDateString('fr-FR')}`,
    '',
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  if (Platform.OS === 'web') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_${client.nom.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } else {
    try {
      const fileName = `rapport_${client.nom.replace(/\s+/g, '_')}_${Date.now()}.csv`;
      const file = new File(Paths.cache, fileName);
      file.create();
      file.write(csvContent);
      
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: `Rapport ${client.nom}`,
      });
    } catch (error) {
      console.error('Error sharing CSV:', error);
      Alert.alert('Erreur', 'Impossible de partager le fichier');
    }
  }
}

export async function exportClientReportPDF(
  client: Client,
  machines: Machine[],
  vgpHistory: VGPHistory[]
): Promise<void> {
  const htmlContent = generateClientReportHTML(client, machines, vgpHistory);

  if (Platform.OS === 'web') {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          URL.revokeObjectURL(blobUrl);
        }, 500);
      };
    } else {
      URL.revokeObjectURL(blobUrl);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les pop-ups ne sont pas bloqués.');
    }
  } else {
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Vérification générale périodique presse plieuses - ${client.nom}`,
        UTI: '.pdf',
      });
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Erreur', 'Impossible de partager le rapport');
    }
  }
}

function generateClientReportHTML(
  client: Client,
  machines: Machine[],
  vgpHistory: VGPHistory[]
): string {
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const machinesHTML = machines
    .map(
      (machine) => `
    <tr>
      <td>${machine.constructeur} ${machine.modele}</td>
      <td>${machine.numeroSerie}</td>
      <td>${machine.typeMachine === 'mobile' ? 'Mobile' : 'Fixe'}</td>
      <td>${formatDate(machine.dateMiseEnService)}</td>
      <td>${machine.dateDerniereVGP ? formatDate(machine.dateDerniereVGP) : 'N/A'}</td>
      <td>${machine.prochaineVGP ? formatDate(machine.prochaineVGP) : 'N/A'}</td>
      <td>${machine.periodicite} mois</td>
    </tr>
  `
    )
    .join('');

  const machineDetailsHTML = machines
    .map((machine) => {
      const history = vgpHistory.filter((h) => h.machineId === machine.id);
      
      const customFieldsHTML = machine.customFields && machine.customFields.length > 0
        ? `
        <div class="info-section">
          <h4>Champs personnalisés</h4>
          <table class="info-table">
            <tbody>
              ${machine.customFields.map(field => `
                <tr>
                  <td class="info-label">${field.label}</td>
                  <td class="info-value">${field.value || 'Non renseigné'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        `
        : '';

      const particularitesHTML = history.length > 0 && history[0].particularites
        ? `
        <div class="info-section">
          <h4>Particularités de la machine</h4>
          <table class="info-table">
            <tbody>
              ${history[0].particularites.modeFonctionnement && history[0].particularites.modeFonctionnement.length > 0 ? `
                <tr>
                  <td class="info-label">Mode(s) de fonctionnement existant(s)</td>
                  <td class="info-value">${history[0].particularites.modeFonctionnement.join(', ')}</td>
                </tr>
              ` : ''}
              ${history[0].particularites.bati && history[0].particularites.bati.length > 0 ? `
                <tr>
                  <td class="info-label">Bâti</td>
                  <td class="info-value">${history[0].particularites.bati.join(', ')}</td>
                </tr>
              ` : ''}
              ${history[0].particularites.commandesMouvements && history[0].particularites.commandesMouvements.length > 0 ? `
                <tr>
                  <td class="info-label">Commandes des mouvements</td>
                  <td class="info-value">${history[0].particularites.commandesMouvements.join(', ')}</td>
                </tr>
              ` : ''}
              ${history[0].particularites.modeChargement && history[0].particularites.modeChargement.length > 0 ? `
                <tr>
                  <td class="info-label">Mode de chargement</td>
                  <td class="info-value">${history[0].particularites.modeChargement.join(', ')}</td>
                </tr>
              ` : ''}
              ${history[0].particularites.modeDechargement && history[0].particularites.modeDechargement.length > 0 ? `
                <tr>
                  <td class="info-label">Mode de déchargement</td>
                  <td class="info-value">${history[0].particularites.modeDechargement.join(', ')}</td>
                </tr>
              ` : ''}
              ${history[0].particularites.course && history[0].particularites.course.type ? `
                <tr>
                  <td class="info-label">Course</td>
                  <td class="info-value">${history[0].particularites.course.type}${history[0].particularites.course.valeur ? ` - ${history[0].particularites.course.valeur} mm` : ''}</td>
                </tr>
              ` : ''}
              ${history[0].particularites.outillageEnPlace && history[0].particularites.outillageEnPlace.length > 0 ? `
                <tr>
                  <td class="info-label">Outillage en place</td>
                  <td class="info-value">${history[0].particularites.outillageEnPlace.join(', ')}</td>
                </tr>
              ` : ''}
              ${history[0].particularites.referenceOutillage ? `
                <tr>
                  <td class="info-label">Référence outillage</td>
                  <td class="info-value">${history[0].particularites.referenceOutillage}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
        `
        : '';

      const protectionDevicesHTML = history.length > 0 && history[0].protectionDevices
        ? `
        <div class="info-section">
          <h4>Dispositifs de protection</h4>
          <div class="protection-devices-list">
            ${history[0].protectionDevices.boutonsArret ? '<div class="protection-device-item"><span class="protection-check">✓</span> Boutons Arrêt</div>' : ''}
            ${history[0].protectionDevices.protecteursFixes ? '<div class="protection-device-item"><span class="protection-check">✓</span> Protecteurs fixes</div>' : ''}
            ${history[0].protectionDevices.protecteursMobilesVerrouilles ? '<div class="protection-device-item"><span class="protection-check">✓</span> Protecteurs mobiles verrouillés</div>' : ''}
            ${history[0].protectionDevices.limitationVitesse ? '<div class="protection-device-item"><span class="protection-check">✓</span> Limitation vitesse à un seuil inférieur à 10 mm/s</div>' : ''}
            ${history[0].protectionDevices.pedale3Positions ? '<div class="protection-device-item"><span class="protection-check">✓</span> Pédale 3 positions</div>' : ''}
          </div>
        </div>
        `
        : '';

      const observationsHTML = machine.observations
        ? `
        <div class="info-section">
          <h4>Observations</h4>
          <p class="observations-text">${machine.observations}</p>
        </div>
        `
        : '';

      const historyHTML = history.length > 0
        ? `
        <div class="info-section">
          <h4>Historique des contrôles (${history.length})</h4>
          ${history.map(h => `
            <div class="history-item">
              <div class="history-header">
                <span class="history-date">${formatDate(h.dateControl)}</span>
                <span class="history-badge ${h.conforme ? 'badge-conforme' : 'badge-non-conforme'}">
                  ${h.conforme ? '✓ Conforme' : '✗ Non conforme'}
                </span>
              </div>
              <div class="history-meta">
                <strong>Technicien:</strong> ${h.technicienEmail}
              </div>
              ${h.observations ? `<div class="history-obs"><strong>Observations:</strong> ${h.observations}</div>` : ''}
              <div class="checklist">
                <strong>Points de contrôle:</strong>
                <ul>
                  ${(h.checklist || []).map(item => `
                    <li class="checklist-item">
                      <span class="checklist-icon ${item.reponse === 'oui' ? 'icon-ok' : item.reponse === 'non' ? 'icon-nok' : 'icon-autre'}">
                        ${item.reponse === 'oui' ? '✓' : item.reponse === 'non' ? '✗' : '•'}
                      </span>
                      ${item.label}
                      ${item.reponse ? `<span class="checklist-reponse">${item.reponse === 'oui' ? 'Oui' : item.reponse === 'non' ? 'Non' : 'Autre'}</span>` : ''}
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
          `).join('')}
        </div>
        `
        : '';

      return `
        <div class="machine-detail-card">
          <div class="machine-detail-header">
            <h3>${machine.constructeur} ${machine.modele}</h3>
            <span class="machine-badge">${machine.typeMachine === 'mobile' ? 'Mobile' : 'Fixe'}</span>
          </div>
          
          <div class="info-section">
            <h4>Informations machine</h4>
            <table class="info-table">
              <tbody>
                <tr>
                  <td class="info-label">Numéro de série</td>
                  <td class="info-value">${machine.numeroSerie}</td>
                </tr>
                <tr>
                  <td class="info-label">Type</td>
                  <td class="info-value">${machine.typeMachine === 'mobile' ? 'Mobile (6 mois)' : 'Fixe (12 mois)'}</td>
                </tr>
                <tr>
                  <td class="info-label">Constructeur</td>
                  <td class="info-value">${machine.constructeur}</td>
                </tr>
                <tr>
                  <td class="info-label">Modèle</td>
                  <td class="info-value">${machine.modele}</td>
                </tr>
                <tr>
                  <td class="info-label">Date de mise en service</td>
                  <td class="info-value">${formatDate(machine.dateMiseEnService)}</td>
                </tr>
                <tr>
                  <td class="info-label">Périodicité VGP</td>
                  <td class="info-value">${machine.periodicite} mois</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="info-section">
            <h4>Contrôles VGP</h4>
            <table class="info-table">
              <tbody>
                ${machine.dateDerniereVGP ? `
                <tr>
                  <td class="info-label">Dernière VGP</td>
                  <td class="info-value">${formatDate(machine.dateDerniereVGP)}</td>
                </tr>
                ` : ''}
                ${machine.prochaineVGP ? `
                <tr>
                  <td class="info-label">Prochaine VGP</td>
                  <td class="info-value vgp-date">${formatDate(machine.prochaineVGP)}</td>
                </tr>
                ` : `
                <tr>
                  <td class="info-label" colspan="2">Aucune VGP enregistrée</td>
                </tr>
                `}
              </tbody>
            </table>
          </div>

          ${customFieldsHTML}
          ${particularitesHTML}
          ${protectionDevicesHTML}
          ${observationsHTML}
          ${historyHTML}
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérification générale périodique presse plieuses - ${client.nom}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #1E3A5F;
      gap: 20px;
    }
    .header-left {
      flex: 0 0 auto;
      max-width: 200px;
    }
    .header-logo {
      width: 180px;
      height: auto;
      display: block;
    }
    .header-center {
      flex: 1;
      text-align: center;
    }
    .header-center h1 {
      color: #1E3A5F;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .header-center p {
      color: #475569;
      font-size: 11px;
      line-height: 1.5;
      margin: 2px 0;
    }
    .header-right {
      flex: 0 0 auto;
      max-width: 280px;
      text-align: left;
    }
    .header-right h2 {
      color: #1E3A5F;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header-right p {
      color: #475569;
      font-size: 11px;
      line-height: 1.5;
      margin: 2px 0;
    }
    .client-info {
      background: #F8FAFC;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .client-info h2 {
      color: #0F172A;
      margin-bottom: 15px;
      font-size: 20px;
    }
    .client-info p {
      margin-bottom: 8px;
      color: #475569;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      color: #0F172A;
      font-size: 24px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #E2E8F0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      background: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #E2E8F0;
    }
    th {
      background: #F8FAFC;
      font-weight: 600;
      color: #0F172A;
      font-size: 14px;
    }
    td {
      color: #475569;
      font-size: 13px;
    }
    .machine-history {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .machine-history h3 {
      color: #2563EB;
      font-size: 18px;
      margin-bottom: 15px;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #E2E8F0;
      text-align: center;
      color: #64748B;
      font-size: 12px;
    }
    .machine-detail-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .machine-detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #1E3A5F;
    }
    .machine-detail-header h3 {
      color: #1E3A5F;
      font-size: 20px;
      margin: 0;
    }
    .machine-badge {
      display: inline-block;
      padding: 6px 12px;
      background: #E0E7EF;
      color: #1E3A5F;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
    .info-section {
      margin-bottom: 20px;
    }
    .info-section h4 {
      color: #0F172A;
      font-size: 16px;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
      box-shadow: none;
    }
    .info-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #F1F5F9;
    }
    .info-label {
      font-weight: 600;
      color: #475569;
      width: 40%;
    }
    .info-value {
      color: #0F172A;
    }
    .vgp-date {
      font-weight: 600;
      color: #1E3A5F;
    }
    .observations-text {
      color: #475569;
      line-height: 1.8;
      padding: 12px;
      background: #F8FAFC;
      border-radius: 6px;
    }
    .history-item {
      background: #F8FAFC;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .history-date {
      font-weight: 600;
      color: #0F172A;
      font-size: 15px;
    }
    .history-badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
    .badge-conforme {
      background: #DCFCE7;
      color: #10B981;
    }
    .badge-non-conforme {
      background: #FEE2E2;
      color: #DC2626;
    }
    .history-meta {
      color: #475569;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .history-obs {
      color: #475569;
      font-size: 14px;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #FFFFFF;
      border-radius: 6px;
    }
    .checklist {
      margin-top: 12px;
    }
    .checklist strong {
      color: #0F172A;
      font-size: 14px;
    }
    .checklist ul {
      list-style: none;
      margin-top: 8px;
    }
    .checklist-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      margin-bottom: 4px;
      background: #FFFFFF;
      border-radius: 6px;
      font-size: 13px;
      color: #475569;
    }
    .checklist-icon {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      text-align: center;
      line-height: 20px;
      margin-right: 10px;
      font-weight: 700;
      font-size: 12px;
    }
    .icon-ok {
      background: #DCFCE7;
      color: #10B981;
    }
    .icon-nok {
      background: #FEE2E2;
      color: #DC2626;
    }
    .icon-autre {
      background: #FEF3C7;
      color: #F59E0B;
    }
    .checklist-reponse {
      margin-left: auto;
      font-weight: 600;
      font-size: 12px;
    }
    .protection-devices-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .protection-device-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      background: #F8FAFC;
      border-radius: 6px;
      font-size: 13px;
      color: #475569;
    }
    .protection-check {
      display: inline-block;
      width: 20px;
      height: 20px;
      background: #DCFCE7;
      color: #10B981;
      border-radius: 50%;
      text-align: center;
      line-height: 20px;
      margin-right: 10px;
      font-weight: 700;
      font-size: 12px;
    }
    @media print {
      body {
        padding: 20px;
      }
      .section {
        page-break-inside: avoid;
      }
      .machine-detail-card {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${GROUPE_ADF_LOGO}" alt="Groupe ADF" class="header-logo" />
    </div>
    
    <div class="header-center">
      <h1>ADF Technologies</h1>
      <p>21 Angely</p>
      <p>12, voie d'Angleterre</p>
      <p>13127 VITROLLES</p>
      <p>04 88 37 52 00</p>
      <p>www.groupeadf.com</p>
    </div>
    
    <div class="header-right">
      <h2>${client.nom}</h2>
      <p>${client.adresse}</p>
      <p>Date: ${today}</p>
      <p><strong>Contact:</strong> ${client.contactPrenom} ${client.contactNom}</p>
      <p><strong>Email:</strong> ${client.contactEmail}</p>
      <p><strong>Tél:</strong> ${client.contactTelephone}</p>
    </div>
  </div>

  <div class="client-info">
    <h2>${client.nom}</h2>
    <p><strong>Adresse:</strong> ${client.adresse}</p>
    <p><strong>Contact:</strong> ${client.contactPrenom} ${client.contactNom}</p>
    <p><strong>Email:</strong> ${client.contactEmail}</p>
    <p><strong>Téléphone:</strong> ${client.contactTelephone}</p>
  </div>

  <div class="section">
    <h2>Parc Machines (${machines.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Machine</th>
          <th>N° Série</th>
          <th>Type</th>
          <th>Mise en service</th>
          <th>Dernière VGP</th>
          <th>Prochaine VGP</th>
          <th>Périodicité</th>
        </tr>
      </thead>
      <tbody>
        ${machinesHTML}
      </tbody>
    </table>
  </div>

  ${machineDetailsHTML ? `
  <div class="section">
    <h2>Fiches Machines Détaillées</h2>
    ${machineDetailsHTML}
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>Groupe ADF - Smart Industrial Solutions</strong></p>
    <p>Document généré automatiquement - Conforme à l'arrêté du 1er mars 2004</p>
    <p>Vérification Générale Périodique (VGP) - Code du travail R.4323-22 à R.4323-28</p>
    <p style="margin-top: 8px; font-size: 11px;">www.groupeadf.com</p>
  </div>
</body>
</html>
  `;
}
