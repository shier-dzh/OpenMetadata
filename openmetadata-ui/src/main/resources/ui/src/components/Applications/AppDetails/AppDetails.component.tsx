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
import {
  ClockCircleOutlined,
  LeftOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { IChangeEvent } from '@rjsf/core';
import { RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import {
  Button,
  Col,
  Dropdown,
  Row,
  Space,
  Tabs,
  Tooltip,
  Typography,
} from 'antd';
import { ItemType } from 'antd/lib/menu/hooks/useItems';
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { noop } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import { ReactComponent as IconExternalLink } from '../../../assets/svg/external-links.svg';
import { ReactComponent as DeleteIcon } from '../../../assets/svg/ic-delete.svg';
import { ReactComponent as IconRestore } from '../../../assets/svg/ic-restore.svg';
import { ReactComponent as IconDropdown } from '../../../assets/svg/menu.svg';
import Loader from '../../../components/Loader/Loader';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import TabsLabel from '../../../components/TabsLabel/TabsLabel.component';
import { DE_ACTIVE_COLOR } from '../../../constants/constants';
import {
  GlobalSettingOptions,
  GlobalSettingsMenuCategory,
} from '../../../constants/GlobalSettings.constants';
import { ServiceCategory } from '../../../enums/service.enum';
import {
  App,
  ScheduleTimeline,
} from '../../../generated/entity/applications/app';
import { Include } from '../../../generated/type/include';
import {
  configureApp,
  deployApp,
  getApplicationByName,
  patchApplication,
  restoreApp,
  triggerOnDemandApp,
  uninstallApp,
} from '../../../rest/applicationAPI';
import { getRelativeTime } from '../../../utils/date-time/DateTimeUtils';
import { getEntityName } from '../../../utils/EntityUtils';
import { formatFormDataForSubmit } from '../../../utils/JSONSchemaFormUtils';
import { getSettingPath } from '../../../utils/RouterUtils';
import { showErrorToast, showSuccessToast } from '../../../utils/ToastUtils';
import FormBuilder from '../../common/FormBuilder/FormBuilder';
import { ManageButtonItemLabel } from '../../common/ManageButtonContentItem/ManageButtonContentItem.component';
import ConfirmationModal from '../../Modals/ConfirmationModal/ConfirmationModal';
import AppLogo from '../AppLogo/AppLogo.component';
import AppRunsHistory from '../AppRunsHistory/AppRunsHistory.component';
import AppSchedule from '../AppSchedule/AppSchedule.component';
import { ApplicationTabs } from '../MarketPlaceAppDetails/MarketPlaceAppDetails.interface';
import './app-details.less';
import { AppAction } from './AppDetails.interface';

const AppDetails = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { fqn } = useParams<{ fqn: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [appData, setAppData] = useState<App>();
  const [showActions, setShowActions] = useState(false);
  const [showDeleteModel, setShowDeleteModel] = useState(false);
  const [jsonSchema, setJsonSchema] = useState<RJSFSchema>();
  const [action, setAction] = useState<AppAction | null>(null);

  const fetchAppDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getApplicationByName(fqn, {
        fields: 'owner,pipelines',
        include: Include.All,
      });
      setAppData(data);
      const schema = await import(
        `../../../utils/ApplicationSchemas/${fqn}.json`
      );
      setJsonSchema(schema);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  }, [fqn]);

  const onBrowseAppsClick = () => {
    history.push(
      getSettingPath(
        GlobalSettingsMenuCategory.INTEGRATIONS,
        GlobalSettingOptions.APPLICATIONS
      )
    );
  };

  const handleRestore = useCallback(async () => {
    if (appData) {
      try {
        await restoreApp(appData.id);
        showSuccessToast(
          t('message.entity-enabled-success', {
            entity: t('label.application'),
          }),
          2000
        );
      } catch (err) {
        showErrorToast(err as AxiosError);
      } finally {
        onBrowseAppsClick();
      }
    }
  }, [appData]);

  const onConfirmAction = useCallback(async () => {
    try {
      if (action === AppAction.ENABLE) {
        handleRestore();
      } else {
        await uninstallApp(
          appData?.fullyQualifiedName ?? '',
          action === AppAction.UNINSTALL
        );

        showSuccessToast(
          action === AppAction.DISABLE
            ? t('message.app-disabled-successfully')
            : t('message.app-uninstalled-successfully')
        );

        onBrowseAppsClick();
      }
    } catch (err) {
      showErrorToast(err as AxiosError);
    }
  }, [appData, action]);

  const manageButtonContent: ItemType[] = [
    ...(appData?.deleted
      ? ([
          {
            label: (
              <ManageButtonItemLabel
                description={t('message.restore-action-description', {
                  entityType: getEntityName(appData),
                })}
                icon={
                  <IconRestore
                    className="m-t-xss"
                    name="Restore"
                    width="18px"
                  />
                }
                id="restore-button"
                name={t('label.restore')}
              />
            ),
            onClick: (e) => {
              e.domEvent.stopPropagation();
              setShowActions(false);
              setAction(AppAction.ENABLE);
              setShowDeleteModel(true);
            },
            key: 'restore-button',
          },
        ] as ItemType[])
      : [
          {
            label: (
              <ManageButtonItemLabel
                description={t('message.disable-app', {
                  app: getEntityName(appData),
                })}
                icon={
                  <StopOutlined
                    style={{ fontSize: '18px', color: DE_ACTIVE_COLOR }}
                  />
                }
                id="disable-button"
                name={t('label.disable')}
              />
            ),
            key: 'disable-button',
            onClick: () => {
              setShowDeleteModel(true);
              setShowActions(false);
              setAction(AppAction.DISABLE);
            },
          },
        ]),
    {
      label: (
        <ManageButtonItemLabel
          description={t('message.uninstall-app', {
            app: getEntityName(appData),
          })}
          icon={<DeleteIcon color={DE_ACTIVE_COLOR} width="18px" />}
          id="uninstall-button"
          name={t('label.uninstall')}
        />
      ),
      key: 'uninstall-button',
      onClick: () => {
        setShowDeleteModel(true);
        setShowActions(false);
        setAction(AppAction.UNINSTALL);
      },
    },
  ];

  const onConfigSave = async (data: IChangeEvent) => {
    if (appData) {
      const updatedFormData = formatFormDataForSubmit(data.formData);
      const updatedData = {
        ...appData,
        appConfiguration: updatedFormData,
      };

      const jsonPatch = compare(appData, updatedData);

      try {
        const response = await patchApplication(appData.id, jsonPatch);
        // call configure endpoint also to update configuration
        await configureApp(appData.fullyQualifiedName ?? '', updatedFormData);
        setAppData(response);
        showSuccessToast(
          t('message.entity-saved-successfully', {
            entity: t('label.configuration'),
          })
        );
      } catch (error) {
        showErrorToast(error as AxiosError);
      }
    }
  };

  const onAppScheduleSave = async (cron: string) => {
    if (appData) {
      const updatedData = {
        ...appData,
        appSchedule: {
          scheduleType: ScheduleTimeline.Custom,
          cronExpression: cron,
        },
      };

      const jsonPatch = compare(appData, updatedData);

      try {
        const response = await patchApplication(appData.id, jsonPatch);
        setAppData(response);
        showSuccessToast(
          t('message.entity-saved-successfully', {
            entity: t('label.schedule'),
          })
        );
      } catch (error) {
        showErrorToast(error as AxiosError);
      }
    }
  };

  const onDemandTrigger = async () => {
    try {
      await triggerOnDemandApp(appData?.fullyQualifiedName ?? '');
      showSuccessToast(
        t('message.application-action-successfully', {
          action: t('label.triggered-lowercase'),
        })
      );
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const onDeployTrigger = async () => {
    try {
      await deployApp(appData?.fullyQualifiedName ?? '');
      showSuccessToast(
        t('message.application-action-successfully', {
          action: t('label.deploy'),
        })
      );
      fetchAppDetails();
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const tabs = useMemo(() => {
    const tabConfiguration =
      appData?.appConfiguration && jsonSchema
        ? [
            {
              label: (
                <TabsLabel
                  id={ApplicationTabs.CONFIGURATION}
                  name={t('label.configuration')}
                />
              ),
              key: ApplicationTabs.CONFIGURATION,
              children: (
                <div>
                  <FormBuilder
                    disableTestConnection
                    useSelectWidget
                    cancelText={t('label.back')}
                    formData={appData.appConfiguration}
                    okText={t('label.submit')}
                    schema={jsonSchema}
                    serviceCategory={ServiceCategory.DASHBOARD_SERVICES}
                    serviceType=""
                    showTestConnection={false}
                    validator={validator}
                    onCancel={noop}
                    onSubmit={onConfigSave}
                  />
                </div>
              ),
            },
          ]
        : [];

    return [
      {
        label: (
          <TabsLabel id={ApplicationTabs.SCHEDULE} name={t('label.schedule')} />
        ),
        key: ApplicationTabs.SCHEDULE,
        children: (
          <div className="p-y-md">
            {appData && (
              <AppSchedule
                appData={appData}
                onCancel={onBrowseAppsClick}
                onDemandTrigger={onDemandTrigger}
                onDeployTrigger={onDeployTrigger}
                onSave={onAppScheduleSave}
              />
            )}
          </div>
        ),
      },
      ...tabConfiguration,
      ...(!appData?.deleted
        ? [
            {
              label: (
                <TabsLabel
                  id={ApplicationTabs.HISTORY}
                  name={t('label.history')}
                />
              ),
              key: ApplicationTabs.HISTORY,
              children: (
                <div className="p-y-md">
                  <AppRunsHistory appData={appData} />
                </div>
              ),
            },
          ]
        : []),
    ];
  }, [appData, jsonSchema]);

  const actionText = useMemo(() => {
    switch (action) {
      case AppAction.ENABLE:
        return t('label.enable-lowercase');
      case AppAction.DISABLE:
        return t('label.disable-lowercase');
      case AppAction.UNINSTALL:
        return t('label.uninstall-lowercase');
      default:
        return '';
    }
  }, [action]);

  useEffect(() => {
    fetchAppDetails();
  }, [fqn]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <PageLayoutV1
      className="app-details-page-layout p-0"
      pageTitle={t('label.application-plural')}>
      <Row>
        <Col className="d-flex" flex="auto">
          <Button
            className="p-0"
            icon={<LeftOutlined />}
            size="small"
            type="text"
            onClick={onBrowseAppsClick}>
            <Typography.Text className="font-medium">
              {t('label.browse-app-plural')}
            </Typography.Text>
          </Button>
        </Col>
        <Col flex="360px">
          <div className="d-flex gap-2 justify-end">
            <Dropdown
              align={{ targetOffset: [-12, 0] }}
              className="m-l-xs"
              menu={{
                items: manageButtonContent,
              }}
              open={showActions}
              overlayClassName="glossary-manage-dropdown-list-container"
              overlayStyle={{ width: '350px' }}
              placement="bottomRight"
              trigger={['click']}
              onOpenChange={setShowActions}>
              <Tooltip placement="right">
                <Button
                  className="glossary-manage-dropdown-button p-x-xs"
                  data-testid="manage-button"
                  icon={
                    <IconDropdown className="vertical-align-inherit manage-dropdown-icon" />
                  }
                  onClick={() => setShowActions(true)}
                />
              </Tooltip>
            </Dropdown>
          </div>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <Space className="app-details-header w-full m-t-md" size={24}>
            <AppLogo appName={appData?.fullyQualifiedName ?? ''} />

            <div className="w-full">
              <Typography.Title level={4}>
                {getEntityName(appData)}
              </Typography.Title>

              <div className="d-flex items-center flex-wrap gap-6">
                <Space size={8}>
                  <ClockCircleOutlined />
                  <Typography.Text className="text-xs text-grey-muted">
                    {`${t('label.installed')} ${getRelativeTime(
                      appData?.updatedAt
                    )}`}
                  </Typography.Text>
                </Space>

                <Space size={8}>
                  <UserOutlined />
                  <Typography.Text className="text-xs text-grey-muted">
                    {t('label.developed-by-developer', {
                      developer: appData?.developer,
                    })}
                  </Typography.Text>
                </Space>

                {appData?.developerUrl && (
                  <div className="flex-center gap-2">
                    <IconExternalLink width={12} />
                    <Typography.Link
                      className="text-xs"
                      href={appData?.developerUrl}
                      target="_blank">
                      <Space>{t('label.visit-developer-website')}</Space>
                    </Typography.Link>
                  </div>
                )}
              </div>
            </div>
          </Space>
        </Col>
        <Col span={24}>
          <Tabs
            destroyInactiveTabPane
            className="app-details-page-tabs"
            data-testid="tabs"
            items={tabs}
          />
        </Col>
      </Row>

      <ConfirmationModal
        bodyText={t('message.are-you-sure-action-property', {
          action: actionText,
          propertyName: getEntityName(appData),
        })}
        cancelText={t('label.cancel')}
        confirmText={t('label.ok')}
        header={t('message.are-you-sure')}
        visible={showDeleteModel}
        onCancel={() => setShowDeleteModel(false)}
        onConfirm={onConfirmAction}
      />
    </PageLayoutV1>
  );
};

export default AppDetails;
