import { Contract } from '@algorandfoundation/tealscript';

export class EscrowService extends Contract {
  /** The agreed cost of the asset or service */
  paymentAmount = GlobalStateKey<uint64>();

  /** Address of the worker (asset receiver) */
  worker = GlobalStateKey<Address>();

  /** Indicates whether the condition for releasing funds has been met */
  conditionMet = GlobalStateKey<boolean>();

  admin = GlobalStateKey<Address>();

  /**
   * Initialize the escrow contract
   *
<<<<<<< HEAD
   * @param worker The worker who will receive the asset if the condition is met
   * @param adminAddress The address of the admin
=======
   * @param worker The worker who will receive the funds
>>>>>>> 1aacbd599406dcc7dcb3a2d563bdcec18fefdf31
   */
  createApplication(worker: Address, adminAddress: Address): void {
    this.paymentAmount.value = 0;
    this.worker.value = worker;
    this.conditionMet.value = false;
    this.admin.value = adminAddress;
  }

  /**
   * Sets the condition to true, allowing funds release, and sends a message to the worker
   * This can be called by the boss upon confirmation that work is done or the asset has been delivered.
   *
   * The address of the worker to confirm identity and send a message
   */
  setConditionMet(): boolean {
    assert(this.txn.sender === this.app.creator || this.txn.sender === this.admin.value); // Only the boss can set the condition
    this.conditionMet.value = true;
    return true;
  }
  /** @param ebaTxn The paymentAmount transaction that adds the paymentamount to the escrow
   */

  addFundsToEscrow(ebaTxn: PayTxn): void {
    assert(this.txn.sender === this.app.creator);

    verifyPayTxn(ebaTxn, {
      receiver: this.app.address,
    });

    this.paymentAmount.value = ebaTxn.amount;
  }

  releaseFunds(): void {
    assert(this.txn.sender === this.app.creator || this.txn.sender === this.admin.value);
    assert(this.conditionMet.value); // Check if the condition is met

    sendPayment({
      receiver: this.worker.value,
      amount: this.paymentAmount.value,
      closeRemainderTo: this.app.creator, // Return remaining balance to the boss
    });
    this.paymentAmount.value = 0;
  }

  /**
   * Method to cancel the escrow and delete the application
   * Returns any remaining funds or assets to the boss
   */
  deleteEscrow(): void {
    assert(this.txn.sender === this.app.creator); // Only the boss can delete the contract

    sendPayment({
      receiver: this.app.creator,
      amount: this.paymentAmount.value,
      closeRemainderTo: this.app.creator,
    });
    this.paymentAmount.value = 0;
  }
}
