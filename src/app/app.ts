import { CurrencyPipe, NgStyle } from '@angular/common';
import { Component, computed, inject, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { ColStylePipe } from 'src/app/col-style.pipe';
import { TypedPTableDirective } from 'src/app/typed-ptable-directive';

@Component({
  selector: 'app-root',
  imports: [
    NgStyle,
    FormsModule,
    CurrencyPipe,
    ButtonModule,
    CheckboxModule,
    DividerModule,
    InputNumberModule,
    TableModule,
    TypedPTableDirective,
    ColStylePipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  /** 還元率 */
  reward_rate = signal<number>(2);
  /** 残高 */
  balance = signal<number>(0);
  /** ポイント残高 */
  point_balance = signal<number>(0);

  private refresh_trigger = signal(false);

  refresh_payment_list() {
    this.refresh_trigger.update((b) => !b);
  }

  /** 期間限定ポイント付与上限 */
  private readonly PROMOTIONAL_POINT_LIMIT = 300 as const;

  /** 請求リスト */
  billing_list = signal<Billing[]>([]);

  private title = inject(Title);

  ngOnInit() {
    this.title.setTitle('メルカリ支払いシミュレーター');
  }

  add_billing() {
    this.billing_list.update((items) => [...items, { eighth: false, mercari: false, amount: 0 }]);
  }

  delete_billing(index: number) {
    this.billing_list.update((items) => items.filter((_, i) => i !== index));
  }

  calc_point(billing: Billing): number {
    return Math.floor(billing.amount * (billing.mercari ? this.reward_rate() / 100 : 0.01));
  }

  calc_promotional_point(billing: Billing): number {
    return Math.floor(billing.eighth ? billing.amount * 0.08 : 0);
  }

  private compare_billing(billing_a: Billing, billing_b: Billing): number {
    const promotional_point_a = this.calc_promotional_point(billing_a);
    const promotional_point_b = this.calc_promotional_point(billing_b);
    if (promotional_point_a !== promotional_point_b) {
      return promotional_point_b - promotional_point_a;
    }

    const point_a = this.calc_point(billing_a);
    const point_b = this.calc_point(billing_b);
    return point_b - point_a;
  }

  /** フィルタ済み・ソート済みの請求リスト */
  private sorted_billing_list = computed(() => {
    return this.billing_list()
      .filter((billing) => billing.amount > 0)
      .sort((billing_a, billing_b) => this.compare_billing(billing_a, billing_b));
  });

  /** Phase 1: 必要チャージ額を算出する */
  private calc_required_charge(billings: Billing[]): number {
    /** 最終的に返す必要チャージ額の累計 */
    let total_required_charge = 0;
    /** シミュレーション中の流動残高 */
    let running_balance = this.balance();
    /** シミュレーション中の流動ポイント */
    let running_point = this.point_balance();
    /** 付与済み期間限定ポイントの累計（上限管理用） */
    let total_granted_promo = 0;

    for (const billing of billings) {
      /** 未払い残額（ポイント・残高で消費するたびに減算される） */
      let unpaid_amount = billing.amount;

      // 1. ポイントを消費
      /** 今回消費するポイント */
      const used_point = Math.min(unpaid_amount, running_point);
      running_point -= used_point;
      unpaid_amount -= used_point;

      // 2. 残高を消費
      /** 今回消費する残高 */
      const used_balance = Math.min(unpaid_amount, running_balance);
      running_balance -= used_balance;
      unpaid_amount -= used_balance;

      // 3. 不足分をチャージに加算
      total_required_charge += unpaid_amount;

      // 4. 次のターンのためのポイント加算
      /** 今回付与する通常ポイント */
      const granted_point = this.calc_point(billing);
      /** 今回付与する期間限定ポイント（上限を考慮済み） */
      const granted_promo = Math.min(
        this.calc_promotional_point(billing),
        Math.max(0, this.PROMOTIONAL_POINT_LIMIT - total_granted_promo),
      );
      total_granted_promo += granted_promo;
      running_point += granted_point + granted_promo;
    }
    return total_required_charge;
  }

  /** Phase 2: 確定したチャージ額を加えた状態で支払い明細を生成する */
  private build_payment_list(billings: Billing[], charge: number): Payment[] {
    /** 支払い進行中の流動残高 */
    let current_balance = this.balance() + charge;
    /** 支払い進行中の流動ポイント */
    let current_point = this.point_balance();
    /** 付与済み期間限定ポイントの累計（上限管理用） */
    let total_granted_promo = 0;

    return billings.map<Payment>((billing) => {
      /** 今回付与する通常ポイント */
      const point = this.calc_point(billing);
      /** 上限考慮前の期間限定ポイント */
      const raw_promo = this.calc_promotional_point(billing);
      /** 上限を考慮した実際の期間限定ポイント付与量 */
      const actual_promo = Math.min(raw_promo, Math.max(0, this.PROMOTIONAL_POINT_LIMIT - total_granted_promo));
      total_granted_promo += actual_promo;

      // 支払いロジック（ポイント -> 残高）
      /** 未払い残額（ポイント・残高で消費するたびに減算される） */
      let unpaid_amount = billing.amount;

      /** 今回消費するポイント */
      const used_point = Math.min(unpaid_amount, current_point);
      current_point -= used_point;
      unpaid_amount -= used_point;

      /** 今回消費する残高 */
      const used_balance = Math.min(unpaid_amount, current_balance);
      current_balance -= used_balance;

      // 次回へ向けたポイント付与
      current_point += point + actual_promo;

      return {
        ...billing,
        point,
        promotional_point: actual_promo,
        after_balance: current_balance,
        after_point: current_point,
      };
    });
  }

  /** 支払いシミュレーション
   * - required_charge_amount, payment_list はここから取り出すだけ。
   */
  private simulate_payment = computed(() => {
    this.refresh_trigger();
    const billings = this.sorted_billing_list();
    const required_charge = this.calc_required_charge(billings);
    const payment_list = this.build_payment_list(billings, required_charge);
    return { required_charge, payment_list };
  });

  /** 必要チャージ額 */
  required_charge_amount = computed(() => this.simulate_payment().required_charge);

  /** 支払い明細 */
  payment_list = computed(() => this.simulate_payment().payment_list);
}

type Billing = {
  /** 8の日 */
  eighth: boolean;
  /** メルカリでの買い物 */
  mercari: boolean;
  /** 金額 */
  amount: number;
};

type Payment = Billing & {
  /** 通常ポイント */
  point: number;
  /** 期間限定ポイント */
  promotional_point: number;

  /** 支払い後の残高 */
  after_balance: number;
  /** 支払い後のポイント（付与分含む） */
  after_point: number;
};
