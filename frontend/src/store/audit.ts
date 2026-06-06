import { create } from 'zustand';
import { AuditResult } from '../types';

interface AuditState {
  sourceCode: string; result: AuditResult | null; isAnalyzing: boolean;
  setSourceCode: (code: string) => void;
  setResult: (r: AuditResult | null) => void;
  setAnalyzing: (v: boolean) => void;
}

const SAMPLE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract VulnerableWallet {
    mapping(address => uint) public balances;
    function withdraw() external {
        uint amount = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        balances[msg.sender] = 0;
    }
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }
    function emergencyWithdraw() external {
        selfdestruct(payable(msg.sender));
    }
    function getTime() external view returns (uint) {
        return block.timestamp;
    }
}`;

export const useAuditStore = create<AuditState>((set) => ({
  sourceCode: SAMPLE, result: null, isAnalyzing: false,
  setSourceCode: (code) => set({ sourceCode: code }),
  setResult: (r) => set({ result: r }),
  setAnalyzing: (v) => set({ isAnalyzing: v }),
}));
