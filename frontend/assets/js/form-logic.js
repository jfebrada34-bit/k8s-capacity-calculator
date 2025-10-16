
  const tribeToSquadMap = {
    'Tribe A': ['Squad Alpha', 'Squad Beta'],
    'Tribe B': ['Squad Gamma', 'Squad Delta'],
    'Tribe C': ['Squad Epsilon', 'Squad Zeta']
  };

  const squadToApproverMap = {
    'Squad Alpha': 'John Doe',
    'Squad Beta': 'Jane Smith',
    'Squad Gamma': 'Carlos Ruiz',
    'Squad Delta': 'Fatima Ali',
    'Squad Epsilon': 'Liam Wong',
    'Squad Zeta': 'Sophia Tan'
  };

  const tribeSelect = document.getElementById('tribe');
  const squadSelect = document.getElementById('squad');
  const approverInput = document.getElementById('approver');

  tribeSelect.addEventListener('change', function() {
    const selectedTribe = this.value;
    squadSelect.innerHTML = '<option value="">-- Select Squad --</option>';
    if (selectedTribe && tribeToSquadMap[selectedTribe]) {
      tribeToSquadMap[selectedTribe].forEach(squad => {
        const option = document.createElement('option');
        option.value = squad;
        option.textContent = squad;
        squadSelect.appendChild(option);
      });
    }
    approverInput.value = ''; // Reset approver
  });

  squadSelect.addEventListener('change', function() {
    const selectedSquad = this.value;
    approverInput.value = squadToApproverMap[selectedSquad] || '';
  });

