import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** 還元率」 */
  reward_rate: number = 1;
  /** 残高 */
  balance: number = 0;
  /** ポイント残高 */
  point_balance: number = 0;
  /** 請求 リスト */
  billing_list: Billing[] = [];

  add_billing() {
    this.billing_list.push({
      eighth: false,
      mercari: false,
      amount: 0,
    });
  }

  delete_billing(index: number) {
    this.billing_list = this.billing_list.filter((_, i) => i !== index);
  }

  get total_billing(): number {
    return this.billing_list.reduce((acc, curr) => acc + curr.amount, 0);
  }

  calc_point(billing: Billing): number {
    return this.math_floor(billing.amount * (billing.mercari ? this.reward_rate / 100 : 0.01));
  }

  calc_limited_point(billing: Billing): number {
    return this.math_floor(billing.eighth ? billing.amount * 0.08 : 0);
  }

  get total_point(): number {
    const point = this.billing_list.reduce((acc, bill) => acc + this.calc_point(bill), 0);
    return point;
  }

  get total_limited_point(): number {
    const limited_point = this.billing_list.reduce((acc, bill) => acc + this.calc_limited_point(bill), 0);
    return 300 < limited_point ? 300 : limited_point;
  }

  private math_floor(n: number): number {
    return Math.floor(n);
  }

  get required_charge_balance(): number {
    const bill_total = this.total_billing;
    const total_point = this.total_point;
    const total_limited_point = this.total_limited_point;

    const balance = this.balance;
    const point_balance = this.point_balance;

    const required_charge_balance = bill_total - total_point - total_limited_point - balance - point_balance;
    return required_charge_balance < 0 ? 0 : required_charge_balance;
  }

  private compare_payment(payment_a: Billing, payment_b: Billing): number {
    // 8の日 の比較
    const eighth = +payment_b.eighth - +payment_a.eighth;
    if (eighth) return eighth;

    const point_a = this.calc_point(payment_a);
    const point_b = this.calc_point(payment_b);

    const point = point_b - point_a;
    if (point) return point;

    return payment_b.amount - payment_a.amount;
  }

  /** 支払い リスト */
  get payment_list(): Billing[] {
    const tmp = this.billing_list.filter((b) => 0 < b.amount).sort((a, b) => this.compare_payment(a, b));
    return tmp;
  }
}

type Billing = {
  /** 8の日 */
  eighth: boolean;
  /** メルカリでの買い物 */
  mercari: boolean;
  /** 金額 */
  amount: number;
};
