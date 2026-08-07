import React from 'react';
import { MembrePersonnel } from '../../types';
import { StudentDocumentsModal } from '../academic/StudentDocumentsModal';

interface StaffDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: MembrePersonnel;
}

export const StaffDocumentsModal: React.FC<StaffDocumentsModalProps> = ({ isOpen, onClose, staff }) => (
  <StudentDocumentsModal
    isOpen={isOpen}
    onClose={onClose}
    staff={staff}
    mode='staff'
  />
);
