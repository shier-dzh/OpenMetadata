/*
 *  Copyright 2023 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { DefaultOptionType } from 'antd/lib/select';
import { Tag } from '../../generated/entity/classification/tag';
import { GlossaryTerm } from '../../generated/entity/data/glossaryTerm';
import { Paging } from '../../generated/type/paging';

export type SelectOption = {
  label: string;
  value: string;
  data?: Tag | GlossaryTerm;
};

export interface AsyncSelectListProps {
  mode?: 'multiple';
  className?: string;
  placeholder?: string;
  debounceTimeout?: number;
  defaultValue?: string[];
  initialOptions?: SelectOption[];
  onChange?: (option: DefaultOptionType | DefaultOptionType[]) => void;
  fetchOptions: (
    search: string,
    page: number
  ) => Promise<{
    data: SelectOption[];
    paging: Paging;
  }>;
}
