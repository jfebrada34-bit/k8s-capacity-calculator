function openEditModal(envSafe, idx) { 
  document.getElementById(`modal-${envSafe}-${idx}`).style.display='block'; 
}
function closeEditModal(envSafe, idx) { 
  document.getElementById(`modal-${envSafe}-${idx}`).style.display='none'; 
}
